from django.contrib.auth import get_user_model
from django.core.exceptions import MultipleObjectsReturned

from applications.filetracking.models import Tracking
from applications.globals.models import Designation, ExtraInfo, HoldsDesignation
from applications.hr2.models import (
    Appraisalform,
    CPDAAdvanceform,
    CPDAReimbursementform,
    Employee,
    EmpConfidentialDetails,
    LeaveBalance,
    LeaveForm,
    LTCform,
)


User = get_user_model()


FORM_MODEL_REGISTRY = {
    "LTC": LTCform,
    "CPDAAdvance": CPDAAdvanceform,
    "CPDAReimbursement": CPDAReimbursementform,
    "Leave": LeaveForm,
    "Appraisal": Appraisalform,
}


def get_user_by_username(username):
    return User.objects.get(username=username)


def get_user_by_id(user_id):
    return User.objects.get(id=user_id)


def get_employee_by_id(employee_id):
    return Employee.objects.get(id=employee_id)


def get_employee_for_user(user):
    return Employee.objects.get(id=user.id)


def get_designation_by_name(name):
    return Designation.objects.get(name=name)


def get_leave_balance_for_employee(employee):
    return LeaveBalance.objects.get(empid=employee)


def get_leave_balance_by_username(username):
    user = get_user_by_username(username)
    employee = get_employee_for_user(user)
    return get_leave_balance_for_employee(employee)


def get_hold_designations_for_user(user):
    return HoldsDesignation.objects.select_related("designation").filter(user=user)


def get_receiver_designation(username, designation_name=None):
    receiver = get_user_by_username(username)
    designations = get_hold_designations_for_user(receiver)
    if designation_name:
        designation = designations.filter(designation__name=designation_name).first()
    else:
        designation = designations.first()
    return receiver, designation


def get_model_for_form_type(form_type):
    return FORM_MODEL_REGISTRY[form_type]


def get_form_by_id(form_type, form_id):
    model = get_model_for_form_type(form_type)
    return model.objects.get(id=form_id)


def get_forms_for_creator(form_type, creator):
    model = get_model_for_form_type(form_type)
    if isinstance(creator, str):
        creator_filter = {"created_by__username": creator}
    else:
        creator_filter = {"created_by": creator}

    queryset = model.objects.filter(**creator_filter)
    preview = list(queryset[:2])
    if not preview:
        return [], True
    if len(preview) == 1:
        return preview[0], False
    return list(queryset), True


def get_latest_tracking_owner(file_id):
    latest = (
        Tracking.objects.select_related("receiver_id")
        .filter(file_id=file_id)
        .order_by("-id")
        .first()
    )
    if not latest:
        return None
    return latest.receiver_id


def get_usernames_like(search_text):
    return User.objects.filter(username__icontains=search_text)


def get_employee_initial_context(employee):
    extra_info = ExtraInfo.objects.filter(user=employee.id).first()
    confidential = EmpConfidentialDetails.objects.filter(empid=employee).first()
    return extra_info, confidential


# =======================
# OPTIMIZED QUERY METHODS (FIX N+1 QUERIES - Issue #6)
# =======================

def get_leave_forms_with_relations(filters=None, limit=None):
    """
    Optimized query for leave forms with all related data (select_related)
    Fixes N+1 problem for list endpoints
    
    Args:
        filters: Dict of filter conditions
        limit: Limit number of results
    
    Returns:
        Optimized queryset with joins
    """
    queryset = LeaveForm.objects.select_related(
        'employee__id',  # FK to User
        'employee__confidential_details',  # Employee details
        'AcademicResponsibility_user',
        'AcademicResponsibility_designation',
        'AdministrativeResponsibility_user',
        'AdministrativeResponsibility_designation',
        'approved_by',
        'approved_by_designation',
        'first_recieved_by',
        'first_recieved_designation'
    ).order_by('-submissionDate')
    
    if filters:
        queryset = queryset.filter(**filters)
    
    if limit:
        queryset = queryset[:limit]
    
    return queryset


def get_leave_forms_for_employee(employee, states=None):
    """Get all leave forms for an employee with optimized queries"""
    queryset = LeaveForm.objects.select_related(
        'employee__id',
        'approved_by',
        'approved_by_designation'
    ).filter(employee=employee).order_by('-submissionDate')
    
    if states:
        queryset = queryset.filter(state__in=states)
    
    return queryset


def get_pending_approvals_for_user(user, approval_level=None):
    """Get pending leave forms that need approval by user (optimized)"""
    from django.db.models import Q
    
    # Get user's designations
    user_designations = get_hold_designations_for_user(user).values_list('designation_id', flat=True)
    
    queryset = LeaveForm.objects.select_related(
        'employee__id',
        'employee__confidential_details',
        'approved_by_designation'
    ).filter(
        Q(AcademicResponsibility_designation_id__in=user_designations) |
        Q(AdministrativeResponsibility_designation_id__in=user_designations),
        state__in=['submitted', 'admin_approved']  # Pending states
    ).order_by('submissionDate')
    
    return queryset


def get_leave_balance_with_details(employee):
    """Get leave balance for employee (single query optimized)"""
    return LeaveBalance.objects.select_related('empid').get(empid=employee)


def get_ltc_forms_with_relations(filters=None):
    """Optimized query for LTC forms"""
    queryset = LTCform.objects.select_related(
        'created_by',
        'approved_by'
    ).order_by('-submissionDate')
    
    if filters:
        queryset = queryset.filter(**filters)
    
    return queryset


def get_cpda_advance_forms_with_relations(filters=None):
    """Optimized query for CPDA Advance forms"""
    queryset = CPDAAdvanceform.objects.select_related(
        'created_by',
        'approved_by'
    ).order_by('-submissionDate')
    
    if filters:
        queryset = queryset.filter(**filters)
    
    return queryset


def get_cpda_reimbursement_forms_with_relations(filters=None):
    """Optimized query for CPDA Reimbursement forms"""
    queryset = CPDAReimbursementform.objects.select_related(
        'created_by',
        'approved_by'
    ).order_by('-submissionDate')
    
    if filters:
        queryset = queryset.filter(**filters)
    
    return queryset


def get_appraisal_forms_with_relations(filters=None):
    """Optimized query for Appraisal forms"""
    queryset = Appraisalform.objects.select_related(
        'created_by',
        'approved_by'
    ).order_by('-submissionDate')
    
    if filters:
        queryset = queryset.filter(**filters)
    
    return queryset


def get_substitute_requests_with_relations(leave_form_id):
    """Get substitute requests for a leave form"""
    from applications.hr2.models import SubstituteRequest
    
    return SubstituteRequest.objects.select_related(
        'leave_form',
        'requesting_employee__id',
        'substitute_employee__id',
        'created_by'
    ).filter(leave_form_id=leave_form_id).order_by('-request_date')


def get_leave_approval_steps(leave_form_id):
    """Get approval steps for a leave form"""
    from applications.hr2.models import LeaveFormApprovalStep
    
    return LeaveFormApprovalStep.objects.select_related(
        'leave_form',
        'assigned_to__id',
        'approval_hierarchy'
    ).filter(leave_form_id=leave_form_id).order_by('step_number')


# ==============================================================================
# BATCH LOOKUP SELECTORS — Prevent N+1 queries in list/history views
# (GPT-identified gap: track_file_react queried User + Designation per row)
# ==============================================================================

def get_users_by_ids(user_ids):
    """
    Batch-fetch User objects by primary key.

    Returns:
        dict mapping user_id (int) → User instance.
        Missing IDs are silently omitted.
    """
    from django.contrib.auth import get_user_model
    _User = get_user_model()
    if not user_ids:
        return {}
    return {u.id: u for u in _User.objects.filter(id__in=user_ids)}


def get_designations_by_ids(designation_ids):
    """
    Batch-fetch Designation objects by primary key.

    Returns:
        dict mapping designation_id (int) → Designation instance.
        Missing IDs are silently omitted.
    """
    if not designation_ids:
        return {}
    return {d.id: d for d in Designation.objects.filter(id__in=designation_ids)}
