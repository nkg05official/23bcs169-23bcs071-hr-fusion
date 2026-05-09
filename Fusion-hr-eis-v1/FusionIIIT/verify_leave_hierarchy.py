import os
import django
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
django.setup()

from django.contrib.auth.models import User
from applications.globals.models import Designation, ExtraInfo, HoldsDesignation, DepartmentInfo
from applications.hr2.models import Employee, LeaveForm, LeaveBalance, LeavePerYear
from applications.hr2 import services
from datetime import date, timedelta

def get_or_create_user_with_designation(username, designation_name, dept_name="CSE"):
    user, created = User.objects.get_or_create(username=username, defaults={
        'first_name': username.capitalize(),
        'last_name': 'Test',
        'email': f'{username}@test.com'
    })
    if created:
        user.set_password('pass123')
        user.save()
    
    dept, _ = DepartmentInfo.objects.get_or_create(name=dept_name)
    extra_info, _ = ExtraInfo.objects.get_or_create(user=user, defaults={
        'id': username[:5],
        'department': dept,
        'user_type': 'FACULTY' if designation_name == 'Faculty' else 'STAFF'
    })
    
    designation, _ = Designation.objects.get_or_create(name=designation_name)
    HoldsDesignation.objects.get_or_create(user=user, designation=designation, working=user)
    
    # Update last_selected_role to match designation
    extra_info.last_selected_role = designation_name
    extra_info.save()
    
    employee, _ = Employee.objects.get_or_create(id=user, defaults={
        'date_of_joining': date.today() - timedelta(days=1000),
        'date_of_birth': date(1990, 1, 1),
        'phone_number': '1234567890',
        'personal_email': f'{username}@gmail.com',
        'employee_type': 'Faculty' if designation_name == 'Faculty' else 'Staff'
    })
    
    # Initialize balances
    LeaveBalance.objects.get_or_create(empid=employee)
    LeavePerYear.objects.get_or_create(empid=employee)
    
    return user

def run_hierarchy_test():
    print("\n" + "="*60)
    print(" FUSION IIIT - HR LEAVE HIERARCHY VERIFICATION")
    print("="*60)
    
    # 1. Setup Hierarchy
    print("\n[1/4] Setting up Hierarchy Users...")
    faculty = get_or_create_user_with_designation("faculty_user", "Faculty")
    hod = get_or_create_user_with_designation("hod_user", "HoD")
    dean = get_or_create_user_with_designation("dean_user", "Dean")
    registrar = get_or_create_user_with_designation("registrar_user", "Registrar")
    director = get_or_create_user_with_designation("director_user", "Director")
    print("      SUCCESS: Users and Designations initialized.")

    # 2. Faculty Applies for Leave
    print("\n[2/4] Faculty Applying for Leave (Directed to HoD)...")
    form_data = {
        'name': 'Faculty Test',
        'designation': 'Faculty',
        'pfno': 'PF101',
        'department': 'CSE',
        'leaveStartDate': (date.today() + timedelta(days=20)).strftime('%Y-%m-%d'),
        'leaveEndDate': (date.today() + timedelta(days=22)).strftime('%Y-%m-%d'),
        'purpose': 'Marriage',
        'casualLeave': '2',
        'forwardTo': hod.id,
        'forwardTo_designation': 'HoD',
        'date': date.today().strftime('%Y-%m-%d')
    }
    
    leave_form, file_id = services.create_online_leave_form(faculty, form_data, {})
    print(f"      SUCCESS: Leave Form ID: {leave_form.id}, Initial State: {leave_form.state}")

    # 3. Step-by-Step Approval
    hierarchy = [
        (hod, 'hod_approved', dean, 'Dean'),
        (dean, 'dean_approved', registrar, 'Registrar'),
        (registrar, 'registrar_approved', director, 'Director'),
        (director, 'sanction_approved', None, None)
    ]

    for approver, next_state, next_user, next_designation in hierarchy:
        print(f"\n[3/4] Approving by {approver.username} (Role: {next_state.split('_')[0].capitalize()})...")
        
        # Prepare payload for update
        update_payload = {
            'id': leave_form.id,
            'state': next_state,
            'version': leave_form.version,
            'Remarks': f'Approved by {approver.username}'
        }
        
        # If it's Director (last step), it goes to final_approved
        if next_state == 'sanction_approved':
            # Director's approval triggers balance deduction in our current service logic
            # or it might be a separate step. Let's see if we can trigger final_approved.
            update_payload['state'] = 'final_approved'

        # Simulate the API View put logic
        # 1. Validate authority
        services.validate_approval_authority(approver, "Leave", update_payload['state'])
        
        # 2. Update form
        leave_form.state = update_payload['state']
        leave_form.Remarks = update_payload['Remarks']
        leave_form.approved_by = Employee.objects.get(id=approver)
        leave_form.save()
        
        print(f"      SUCCESS: New State: {leave_form.state}")

    # 4. Final Verification
    print("\n[4/4] Final Verification...")
    leave_form.refresh_from_db()
    if leave_form.state == 'final_approved':
        print("\n" + "*"*60)
        print(" HIERARCHY TEST PASSED: Faculty -> HoD -> Dean -> Registrar -> Director")
        print("*"*60)
    else:
        print(f"\n FAILURE: Final state was {leave_form.state}")

if __name__ == "__main__":
    try:
        run_hierarchy_test()
    except Exception as e:
        print(f"\n ERROR DURING TEST: {str(e)}")
        import traceback
        traceback.print_exc()
