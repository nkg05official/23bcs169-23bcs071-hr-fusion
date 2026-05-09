import os
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.contrib.auth.models import User
from applications.globals.models import ExtraInfo, DepartmentInfo
from applications.hr2.models import Employee, EmpConfidentialDetails

try:
    from django.contrib.auth.models import User
    from applications.globals.models import ExtraInfo, DepartmentInfo, Designation, HoldsDesignation, Faculty, Staff
    from applications.hr2.models import Employee, EmpConfidentialDetails, LeaveBalance, LeavePerYear

    # Ensure some test users exist
    user_data = [
        {'username': 'fusion_admin', 'first_name': 'Fusion', 'last_name': 'Admin', 'email': 'admin@fusion.com'},
        {'username': 'faculty1', 'first_name': 'Faculty', 'last_name': 'One', 'email': 'faculty1@fusion.com'},
        {'username': 'hradmin', 'first_name': 'HR', 'last_name': 'Admin', 'email': 'hradmin@fusion.com'},
        {'username': 'hod1', 'first_name': 'HOD', 'last_name': 'CSE', 'email': 'hod1@fusion.com'},
    ]

    for data in user_data:
        u, created = User.objects.get_or_create(username=data['username'], defaults={
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'email': data['email']
        })
        if created:
            u.set_password('hello123')
            u.save()
            print(f"Created user {u.username}")

    users_to_provision = User.objects.filter(username__in=[d['username'] for d in user_data])

    # Ensure basic designations exist
    designations = ['Faculty', 'Staff', 'HOD', 'SectionHead_HR']
    for d_name in designations:
        Designation.objects.get_or_create(name=d_name)

    for u in users_to_provision:
        print(f"Provisioning {u.username}...")
        
        # 1. ExtraInfo
        user_type = 'faculty' if 'faculty' in u.username or 'hod' in u.username or 'admin' in u.username else 'staff'
        try:
            extra = ExtraInfo.objects.get(user=u)
            if not extra.id or extra.id == "":
                # We can't easily change the primary key in Django ORM if it's already set
                # But we can try via raw SQL if needed. For now, let's just use what's there
                # if it's not empty. If it's empty, we have a problem.
                print(f"Warning: ExtraInfo for {u.username} has empty ID.")
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE globals_extrainfo SET id = %s WHERE user_id = %s", [u.username, u.id])
                extra = ExtraInfo.objects.get(user=u)
        except ExtraInfo.DoesNotExist:
            extra = ExtraInfo.objects.create(id=u.username, user=u, user_type=user_type)
            
        dept, _ = DepartmentInfo.objects.get_or_create(name='CSE')
        extra.department = dept
        extra.save()

        # 2. HoldsDesignation
        d_name = 'Faculty' if user_type == 'faculty' else 'Staff'
        if 'hod' in u.username: d_name = 'HOD'
        if 'hradmin' in u.username: d_name = 'SectionHead_HR'
        
        designation = Designation.objects.get(name=d_name)
        HoldsDesignation.objects.get_or_create(user=u, working=u, designation=designation)

        # 3. Faculty/Staff model entries
        if user_type == 'faculty':
            Faculty.objects.get_or_create(id=extra)
        else:
            Staff.objects.get_or_create(id=extra)
        
        # 4. Employee
        emp, _ = Employee.objects.update_or_create(
            id=u, 
            defaults={
                'father_name': 'N/A', 'mother_name': 'N/A', 'category': 'General',
                'caste': 'N/A', 'home_state': 'N/A', 'home_district': 'N/A',
                'full_address': 'N/A', 'date_of_joining': '2020-01-01',
                'date_of_birth': '1990-01-01', 'blood_group': 'O+',
                'phone_number': '1234567890', 'personal_email': u.email,
                'emergency_contact_number': '1234567890', 'emergency_contact_name': 'N/A',
                'employee_type': 'Faculty' if user_type == 'faculty' else 'Staff'
            }
        )
        
        # 5. Confidential
        import random
        aadhar = f'12345678{random.randint(1000, 9999)}'
        pan = f'ABCDE{random.randint(1000, 9999)}F'
        EmpConfidentialDetails.objects.update_or_create(
            empid=emp, 
            defaults={
                'aadhar_number': aadhar, 'pan_number': pan,
                'marital_status': 'Single', 'personal_file_number': f'PFN-{u.id:04d}',
                'bank_account_number': f'123456789{u.id}'[:20], 'basic_pay': 50000.00
            }
        )
        
        # 6. Leave Data
        LeavePerYear.objects.get_or_create(empid=emp)
        LeaveBalance.objects.update_or_create(
            empid=emp,
            defaults={
                'financial_year': '2025-26',
                'casual_leave_balance': 8,
                'earned_leave_balance': 15,
                'half_pay_leave_balance': 15,
                'special_casual_leave_balance': 15,
                'vacation_leave_balance': 60,
                'maternity_leave_balance': 180,
                'child_care_leave_balance': 730,
                'paternity_leave_balance': 15,
                'leave_encashment_balance': 60,
                'restricted_holiday_balance': 2,
            }
        )
    
    print("\nSUCCESS: All requested users have been provisioned with complete HR profiles, Designations, and leave balances!")
except Exception as e:
    print("ERROR:", str(e))
