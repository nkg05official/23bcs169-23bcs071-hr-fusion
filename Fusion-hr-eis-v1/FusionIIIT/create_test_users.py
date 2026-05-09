import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from applications.globals.models import ExtraInfo, DepartmentInfo, Designation, HoldsDesignation, Faculty, Staff
from applications.hr2.models import Employee, EmpConfidentialDetails, LeaveBalance, LeavePerYear
import random

print("=" * 80)
print("CREATING NEW FUSION USERS")
print("=" * 80)

# Create HR User
print("\n[1/2] Creating HR User...")
hr_user, hr_created = User.objects.get_or_create(
    username='hrmanager1',
    defaults={
        'first_name': 'HR',
        'last_name': 'Manager',
        'email': 'hrmanager@fusion.edu',
        'is_staff': False,
        'is_active': True
    }
)
if hr_created:
    hr_user.set_password('HRPass@2024')
    hr_user.save()
    print(f"✓ Created HR User: {hr_user.username}")
else:
    print(f"✓ HR User already exists: {hr_user.username}")

# Setup HR user profile
try:
    hr_extra = ExtraInfo.objects.get(user=hr_user)
except ExtraInfo.DoesNotExist:
    hr_extra = ExtraInfo.objects.create(id=hr_user.username, user=hr_user, user_type='staff')

dept, _ = DepartmentInfo.objects.get_or_create(name='HR')
hr_extra.department = dept
hr_extra.last_selected_role = 'SectionHead_HR'
hr_extra.save()

# HR Designation
hr_desig, _ = Designation.objects.get_or_create(name='SectionHead_HR')
HoldsDesignation.objects.get_or_create(user=hr_user, working=hr_user, designation=hr_desig)

# HR Staff entry
Staff.objects.get_or_create(id=hr_extra)

# HR Employee
hr_emp, _ = Employee.objects.update_or_create(
    id=hr_user,
    defaults={
        'father_name': 'N/A',
        'mother_name': 'N/A',
        'category': 'General',
        'caste': 'N/A',
        'home_state': 'N/A',
        'home_district': 'N/A',
        'full_address': 'N/A',
        'date_of_joining': '2020-01-01',
        'date_of_birth': '1985-01-01',
        'blood_group': 'O+',
        'phone_number': '9876543210',
        'personal_email': hr_user.email,
        'emergency_contact_number': '9876543210',
        'emergency_contact_name': 'N/A',
        'employee_type': 'Staff'
    }
)

# HR Confidential
aadhar_hr = f'12345678{random.randint(1000, 9999)}'
pan_hr = 'ABCHR0001'
EmpConfidentialDetails.objects.update_or_create(
    empid=hr_emp,
    defaults={
        'aadhar_number': aadhar_hr,
        'pan_number': pan_hr,
        'marital_status': 'Single',
        'personal_file_number': 'PFNHR001',
        'bank_account_number': '1234567890',
        'basic_pay': 75000.00
    }
)

# HR Leave Balance
LeavePerYear.objects.get_or_create(empid=hr_emp)
LeaveBalance.objects.update_or_create(
    empid=hr_emp,
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

print(f"✓ HR profile fully setup with leave balances")

# Create Faculty User
print("\n[2/2] Creating Faculty User...")
fac_user, fac_created = User.objects.get_or_create(
    username='faculty_user1',
    defaults={
        'first_name': 'Faculty',
        'last_name': 'Member',
        'email': 'faculty@fusion.edu',
        'is_staff': False,
        'is_active': True
    }
)
if fac_created:
    fac_user.set_password('FacPass@2024')
    fac_user.save()
    print(f"✓ Created Faculty User: {fac_user.username}")
else:
    print(f"✓ Faculty User already exists: {fac_user.username}")

# Setup Faculty user profile
try:
    fac_extra = ExtraInfo.objects.get(user=fac_user)
except ExtraInfo.DoesNotExist:
    fac_extra = ExtraInfo.objects.create(id=fac_user.username, user=fac_user, user_type='faculty')

dept_cse, _ = DepartmentInfo.objects.get_or_create(name='CSE')
fac_extra.department = dept_cse
fac_extra.last_selected_role = 'Faculty'
fac_extra.save()

# Faculty Designation
fac_desig, _ = Designation.objects.get_or_create(name='Faculty')
HoldsDesignation.objects.get_or_create(user=fac_user, working=fac_user, designation=fac_desig)

# Faculty entry
Faculty.objects.get_or_create(id=fac_extra)

# Faculty Employee
fac_emp, _ = Employee.objects.update_or_create(
    id=fac_user,
    defaults={
        'father_name': 'N/A',
        'mother_name': 'N/A',
        'category': 'General',
        'caste': 'N/A',
        'home_state': 'N/A',
        'home_district': 'N/A',
        'full_address': 'N/A',
        'date_of_joining': '2019-07-01',
        'date_of_birth': '1988-03-15',
        'blood_group': 'AB+',
        'phone_number': '9123456789',
        'personal_email': fac_user.email,
        'emergency_contact_number': '9123456789',
        'emergency_contact_name': 'N/A',
        'employee_type': 'Faculty'
    }
)

# Faculty Confidential
aadhar_fac = f'12345678{random.randint(1000, 9999)}'
pan_fac = 'ABCFAC001'
EmpConfidentialDetails.objects.update_or_create(
    empid=fac_emp,
    defaults={
        'aadhar_number': aadhar_fac,
        'pan_number': pan_fac,
        'marital_status': 'Married',
        'personal_file_number': 'PFNFAC001',
        'bank_account_number': '9876543210',
        'basic_pay': 95000.00
    }
)

# Faculty Leave Balance
LeavePerYear.objects.get_or_create(empid=fac_emp)
LeaveBalance.objects.update_or_create(
    empid=fac_emp,
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

print(f"✓ Faculty profile fully setup with leave balances")

print("\n" + "=" * 80)
print("USER CREDENTIALS")
print("=" * 80)
print("\n📋 HR USER:")
print(f"   Username: {hr_user.username}")
print(f"   Password: HRPass@2024")
print(f"   Email:    {hr_user.email}")
print(f"   Role:     SectionHead_HR")
print(f"   Department: HR")

print("\n📋 FACULTY USER:")
print(f"   Username: {fac_user.username}")
print(f"   Password: FacPass@2024")
print(f"   Email:    {fac_user.email}")
print(f"   Role:     Faculty")
print(f"   Department: CSE")

print("\n" + "=" * 80)
print("✅ Both users created successfully with full profiles and leave balances!")
print("=" * 80)
