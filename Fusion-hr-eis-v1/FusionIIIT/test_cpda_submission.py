#!/usr/bin/env python
import os
import sys
import django

# Add the FusionIIIT directory to Python path
sys.path.insert(0, r'c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings')
django.setup()

from django.contrib.auth.models import User
from applications.employees.models import Employee
from applications.hr2.models import CPDAAdvanceform

# Check if faculty_user1 exists
user = User.objects.filter(username='faculty_user1').first()
if not user:
    print("ERROR: faculty_user1 not found")
    sys.exit(1)

print(f"User found: {user.username} (ID: {user.id})")

# Check if Employee exists
employee = Employee.objects.filter(id=user).first()
if not employee:
    print(f"ERROR: No Employee record for {user.username}")
    print("\nAvailable employees:")
    for emp in Employee.objects.all()[:5]:
        print(f"  - {emp.id.username} (ID: {emp.id_id})")
    sys.exit(1)

print(f"Employee found: {employee}")
print(f"Employee type: {employee.employee_type}")

# Check existing CPDA forms for this employee
cpda_forms = CPDAAdvanceform.objects.filter(employee=employee)
print(f"\nExisting CPDA forms for {user.username}: {cpda_forms.count()}")
for form in cpda_forms:
    print(f"  - Form ID: {form.id}, Status: {form.status}, Created by: {form.created_by}")

# Now let's try to simulate a CPDA form submission
print("\n--- Testing CPDA Form Submission Logic ---")

# Prepare CPDA payload
payload = {
    "name": "Faculty User 1",
    "designation": "Assistant Professor",
    "pfNo": 12345,
    "purpose": "Conference attendance",
    "amountRequired": 50000,
    "submissionDate": "2026-04-20",
    "balanceAvailable": 100000,
    "employee": employee.id,
    "created_by": user.id,
}

print(f"Payload: {payload}")
print(f"Employee ID in payload: {payload.get('employee')}")
print(f"Created by in payload: {payload.get('created_by')}")

# Check validation
print(f"\nValidation checks:")
print(f"1. Employee type is Faculty: {employee.employee_type == 'Faculty'}")
print(f"2. Amount > 0: {payload['amountRequired'] > 0}")
print(f"3. Amount <= MAX_CPDA_ADVANCE_AMOUNT (100000): {payload['amountRequired'] <= 100000}")
