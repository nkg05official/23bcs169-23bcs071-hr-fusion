import django
from django.contrib.auth.models import User
from applications.globals.models import ExtraInfo, DepartmentInfo
from applications.hr2.models import Employee, EmpConfidentialDetails

try:
    user = User.objects.get(username='fusion_admin')
    
    # 1. ExtraInfo
    extra, created = ExtraInfo.objects.get_or_create(user=user, defaults={
        'user_type': 'faculty',
    })
    
    # Optional: ensure department exists
    dept, _ = DepartmentInfo.objects.get_or_create(name='CSE')
    extra.department = dept
    extra.save()
    
    # 2. Employee
    emp, created = Employee.objects.get_or_create(id=user, defaults={
        'extra_info': extra
    })
    
    # 3. EmpConfidentialDetails
    # We need to find what fields are required, or what the foreign key is. Usually it is `employee=emp` or `user=user`. Let's assume it has an employee or extra_info one to one field.
    # Looking at typical Fusion models, EmpConfidentialDetails links to employee.
    
    # Let's inspect the fields dynamically
    field_names = [f.name for f in EmpConfidentialDetails._meta.get_fields()]
    
    # Link usually by employee or user
    kwargs = {}
    if 'employee' in field_names:
        kwargs['employee'] = emp
    elif 'extra_info' in field_names:
        kwargs['extra_info'] = extra
    elif 'user' in field_names:
        kwargs['user'] = user

    kwargs['defaults'] = {'personal_file_number': 'PFN-12345'}
    
    confidential, _ = EmpConfidentialDetails.objects.get_or_create(**kwargs)
    
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
