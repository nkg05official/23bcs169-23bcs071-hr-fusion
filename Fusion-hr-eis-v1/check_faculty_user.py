#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings')
django.setup()

from django.contrib.auth.models import User
from applications.employees.models import Employee
from applications.hr2.models import LeaveForm

# Check if faculty_user1 exists
user = User.objects.filter(username='faculty_user1').first()
if user:
    print(f"User found: {user.username} (ID: {user.id})")
    employee = Employee.objects.filter(id=user).first()
    if employee:
        print(f"Employee found: {employee}")
        
        # Check leave forms for this employee
        leave_forms = LeaveForm.objects.filter(employee=employee)
        print(f"Leave forms for this employee: {leave_forms.count()}")
        for form in leave_forms:
            print(f"  - Form ID: {form.id}, Status: {form.status}, Submitted: {form.submissionDate}")
    else:
        print("NO Employee record found for this user!")
        # List all Employee records
        print("\nAll Employee records:")
        for emp in Employee.objects.all()[:5]:
            print(f"  - {emp.id.username}")
else:
    print("User not found")
    
# Also check all LeaveForm records
print("\nAll LeaveForm records in database:")
all_forms = LeaveForm.objects.all()
for form in all_forms:
    print(f"  - Form ID: {form.id}, Employee: {form.employee.id.username if form.employee else 'None'}, Status: {form.status}")
