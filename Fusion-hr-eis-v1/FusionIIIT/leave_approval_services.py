"""
Leave Approval Routing and Escalation Services
Implements automatic hierarchical routing per BR-HR-010, BR-HR-018
"""

from datetime import datetime, timedelta
from django.db import transaction
from django.db.models import Q
from applications.hr2.models import (
    LeaveForm, LeaveFormApprovalStep, ApprovalHierarchy, 
    Employee, LeaveBalance
)
from applications.globals.models import HoldsDesignation
from django.utils import timezone


def determine_leave_type_category(leave_form):
    """
    Determine if leave is CL/RH only or includes other types (SCL/HR/COL/VL)
    BR-HR-010: CL/RH only → HoD final; Others → Multi-level approval
    """
    leave_counts = {
        'CL': leave_form.Noof_CasualLeave,
        'RH': leave_form.Noof_restrictedHoliday,
        'SCL': leave_form.Noof_specialCasualLeave,
        'HR': leave_form.Noof_earnedLeave,
        'COL': leave_form.Noof_commutedLeave,
        'VL': leave_form.Noof_vacationLeave,
    }
    
    has_other_leaves = (
        leave_counts['SCL'] > 0 or 
        leave_counts['HR'] > 0 or 
        leave_counts['COL'] > 0 or 
        leave_counts['VL'] > 0
    )
    
    if has_other_leaves:
        return 'SCL_HR_COL_VL'  # Multi-level approval needed
    else:
        return 'CL_RH_Only'  # HoD final


def get_employee_department(employee):
    """
    Get employee's department from ExtraInfo
    """
    from applications.globals.models import ExtraInfo
    extra_info = ExtraInfo.objects.filter(user=employee.id).first()
    if extra_info and extra_info.department:
        return extra_info.department
    
    return None


def get_hod_for_department(department):
    """
    Get Head of Department for a given department
    BR-HR-018: Resolve next approver from hierarchy
    """
    from applications.globals.models import Designation
    
    hod_desig = Designation.objects.filter(name='Head of Department').first()
    if not hod_desig:
        return None
    
    # Find user with HoD designation and matching ExtraInfo.department.
    for holds_desig in HoldsDesignation.objects.filter(designation=hod_desig).select_related('user'):
        from applications.globals.models import ExtraInfo
        is_same_department = ExtraInfo.objects.filter(
            user=holds_desig.user,
            department=department,
        ).exists()
        if is_same_department and hasattr(holds_desig.user, 'employee_details'):
            return holds_desig.user.employee_details
    
    return None


def get_next_approver_for_level(department, approval_level):
    """
    Get the approver user for a specific approval level
    """
    hierarchy = ApprovalHierarchy.objects.filter(
        form_type='leave',
        approval_level=approval_level,
        department=department,
        is_active=True
    ).first()
    
    if not hierarchy:
        return None
    
    # Find user with required designation in this department
    for holds_desig in HoldsDesignation.objects.filter(
        designation=hierarchy.required_designation
    ).select_related('user'):
        from applications.globals.models import ExtraInfo
        is_same_department = ExtraInfo.objects.filter(
            user=holds_desig.user,
            department=department,
        ).exists()
        if is_same_department and hasattr(holds_desig.user, 'employee_details'):
            return holds_desig.user.employee_details
    
    return None


@transaction.atomic
def route_leave_for_approval(leave_form):
    """
    Initial routing when leave is submitted
    BR-HR-018: Route to HoD based on hierarchy
    BR-HR-010: Determine final authority (HoD for CL/RH, or higher for others)
    """
    
    # Determine leave category
    leave_category = determine_leave_type_category(leave_form)
    
    # Get employee's department
    department = get_employee_department(leave_form.employee)
    if not department:
        raise ValueError("Employee has no department assigned")
    
    # Get HoD for initial routing
    hod = get_hod_for_department(department)
    if not hod:
        raise ValueError(f"No Head of Department found for {department.name}")
    
    # Create first approval step
    hierarchy_config = ApprovalHierarchy.objects.filter(
        form_type='leave',
        leave_type=leave_category,
        approval_level=1,
        department=department,
        is_active=True
    ).first()
    
    if not hierarchy_config:
        raise ValueError(f"No approval hierarchy configured for {leave_category}")
    
    # Calculate due date
    due_date = timezone.now() + timedelta(days=hierarchy_config.sla_days)
    
    # Create approval step
    approval_step = LeaveFormApprovalStep.objects.create(
        leave_form=leave_form,
        approval_hierarchy=hierarchy_config,
        step_number=1,
        assigned_to=hod,
        due_date=due_date,
        status='pending'
    )
    
    # Update leave form state
    leave_form.state = 'submitted'
    leave_form.save()
    
    print(f"✓ Leave {leave_form.id} routed to HoD: {hod.id.username}")
    return approval_step


@transaction.atomic
def escalate_to_next_approver(approval_step):
    """
    Automatically escalate to next approver when current step is approved
    BR-HR-018: Resolve hierarchy and forward
    BR-HR-019: SLA enforcement
    """
    
    leave_form = approval_step.leave_form
    department = get_employee_department(leave_form.employee)
    leave_category = determine_leave_type_category(leave_form)
    
    # Get current approval level
    current_level = approval_step.step_number
    
    # Get next hierarchy level
    next_hierarchy = ApprovalHierarchy.objects.filter(
        form_type='leave',
        leave_type=leave_category,
        approval_level=current_level + 1,
        department=department,
        is_active=True
    ).first()
    
    if not next_hierarchy:
        # No next level - this was final approval
        leave_form.state = 'final_approved'
        leave_form.save()
        print(f"✓ Leave {leave_form.id} reached final approval")
        return None
    
    # Get next approver
    next_approver = get_next_approver_for_level(department, current_level + 1)
    if not next_approver:
        raise ValueError(f"No approver found for level {current_level + 1}")
    
    # Create next approval step
    due_date = timezone.now() + timedelta(days=next_hierarchy.sla_days)
    
    next_step = LeaveFormApprovalStep.objects.create(
        leave_form=leave_form,
        approval_hierarchy=next_hierarchy,
        step_number=current_level + 1,
        assigned_to=next_approver,
        due_date=due_date,
        status='pending'
    )
    
    # Update leave form state based on level
    if current_level == 1:
        leave_form.state = 'hod_approved'
    elif current_level == 2:
        leave_form.state = 'admin_approved'
    
    leave_form.save()
    
    print(f"✓ Leave {leave_form.id} escalated to Level {current_level + 1}: {next_approver.id.username}")
    return next_step


@transaction.atomic
def approve_leave_step(approval_step, remarks=''):
    """
    Approve a leave at current step and escalate to next
    """
    
    if approval_step.status != 'pending':
        raise ValueError(f"Can only approve pending steps. Current status: {approval_step.status}")
    
    # Mark current step as accepted
    approval_step.status = 'accepted'
    approval_step.response_date = timezone.now()
    approval_step.remarks = remarks
    approval_step.save()
    
    # Escalate to next approver
    return escalate_to_next_approver(approval_step)


@transaction.atomic
def reject_leave_step(approval_step, remarks=''):
    """
    Reject a leave at current step and revert to employee
    """
    
    if approval_step.status != 'pending':
        raise ValueError(f"Can only reject pending steps. Current status: {approval_step.status}")
    
    # Mark current step as rejected
    approval_step.status = 'rejected'
    approval_step.response_date = timezone.now()
    approval_step.remarks = remarks
    approval_step.save()
    
    # Revert leave form state
    leave_form = approval_step.leave_form
    leave_form.state = 'submitted'  # Back to submitted for resubmission
    leave_form.save()
    
    print(f"✓ Leave {leave_form.id} rejected at step {approval_step.step_number}")
    return None


def get_pending_approvals_for_user(user):
    """
    Get all pending leave approvals assigned to a user
    """
    employee = getattr(user, 'employee_details', None)
    if not employee:
        return LeaveFormApprovalStep.objects.none()
    
    return LeaveFormApprovalStep.objects.filter(
        assigned_to=employee,
        status='pending'
    ).select_related('leave_form', 'approval_hierarchy')


def check_sla_breaches():
    """
    Check for SLA breaches and escalate if needed (BR-HR-019)
    """
    now = timezone.now()
    breached_steps = LeaveFormApprovalStep.objects.filter(
        status='pending',
        due_date__lt=now,
        escalation_count=0  # Not yet escalated
    )
    
    count = 0
    for step in breached_steps:
        step.escalation_count += 1
        step.last_escalation_date = now
        step.status = 'escalated'
        step.save()
        count += 1
        print(f"⚠️  SLA breach detected: Leave {step.leave_form.id} - Step {step.step_number}")
    
    return count


# ============================================
# TEST FUNCTIONS
# ============================================

def test_complete_leave_approval_flow():
    """
    Test the complete leave approval flow
    """
    print("\n" + "=" * 80)
    print("TESTING COMPLETE LEAVE APPROVAL FLOW")
    print("=" * 80)
    
    from applications.hr2.models import LeaveBalance
    from django.contrib.auth.models import User
    
    # Get faculty user
    faculty_user = User.objects.filter(username='faculty_user1').first()
    if not faculty_user:
        print("❌ faculty_user1 not found. Run setup_leave_hierarchy.py first")
        return
    
    faculty_employee = getattr(faculty_user, 'employee_details', None)
    if not faculty_employee:
        print("❌ faculty_user1 has no Employee profile. Run setup_leave_hierarchy.py first")
        return
    department = get_employee_department(faculty_employee)
    
    print(f"\n📝 Creating leave request for: {faculty_user.username}")
    print(f"   Department: {department.name if department else 'N/A'}")
    
    # Create a leave form
    with transaction.atomic():
        leave_form = LeaveForm.objects.create(
            employee=faculty_employee,
            name=faculty_user.get_full_name(),
            designation='Faculty',
            submissionDate=datetime.now().date(),
            departmentInfo=department.name if department else 'N/A',
            leaveStartDate=datetime.now().date() + timedelta(days=10),
            leaveEndDate=datetime.now().date() + timedelta(days=12),
            Noof_CasualLeave=3,
            Purpose_of_leave='Personal leave',
            state='draft',
        )
        
        print(f"\n✓ Leave form created: ID={leave_form.id}")
        print(f"  Leave Type: Casual Leave (3 days)")
        print(f"  Dates: {leave_form.leaveStartDate} to {leave_form.leaveEndDate}")
        
        # Route for approval
        print(f"\n🔄 Routing for approval...")
        step1 = route_leave_for_approval(leave_form)
        print(f"  Current State: {leave_form.state}")
        print(f"  Assigned to: {step1.assigned_to.id.username}")
        print(f"  Due Date: {step1.due_date}")
        
        # Simulate HoD approval
        print(f"\n✅ HoD Approves...")
        step2 = approve_leave_step(step1, remarks="Approved by HoD")
        
        # Since CL/RH only, it should be final
        leave_form.refresh_from_db()
        print(f"  Final State: {leave_form.state}")
        
        if leave_form.state == 'final_approved':
            print(f"  ✅ Leave approved and finalized!")
        else:
            print(f"  ⚠️  Leave escalated to next level: {step2.assigned_to.id.username if step2 else 'None'}")

if __name__ == '__main__':
    test_complete_leave_approval_flow()
