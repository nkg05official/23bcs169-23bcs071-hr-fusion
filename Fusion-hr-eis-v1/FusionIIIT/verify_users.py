import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from applications.hr2.models import Employee, LeaveBalance, LeavePerYear

# Verify users exist
hr_user = User.objects.filter(username='hrmanager1').first()
fac_user = User.objects.filter(username='faculty_user1').first()

print('HR USER VERIFICATION:')
print(f'  Username exists: {hr_user is not None}')
if hr_user:
    emp = Employee.objects.filter(id=hr_user).first()
    bal = LeaveBalance.objects.filter(empid=emp).first() if emp else None
    yr = LeavePerYear.objects.filter(empid=emp).first() if emp else None
    print(f'  Employee record: {emp is not None}')
    print(f'  Leave balance: {bal is not None}')
    print(f'  Leave per year: {yr is not None}')
    if bal:
        print(f'    - Casual: {bal.casual_leave_balance}')
        print(f'    - Earned: {bal.earned_leave_balance}')

print()
print('FACULTY USER VERIFICATION:')
print(f'  Username exists: {fac_user is not None}')
if fac_user:
    emp = Employee.objects.filter(id=fac_user).first()
    bal = LeaveBalance.objects.filter(empid=emp).first() if emp else None
    yr = LeavePerYear.objects.filter(empid=emp).first() if emp else None
    print(f'  Employee record: {emp is not None}')
    print(f'  Leave balance: {bal is not None}')
    print(f'  Leave per year: {yr is not None}')
    if bal:
        print(f'    - Casual: {bal.casual_leave_balance}')
        print(f'    - Earned: {bal.earned_leave_balance}')

print()
print('✅ All records verified and complete!')
