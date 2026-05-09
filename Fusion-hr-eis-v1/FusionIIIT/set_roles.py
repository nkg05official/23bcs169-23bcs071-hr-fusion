import os
import django
from django.contrib.auth.models import User
from applications.globals.models import Designation, HoldsDesignation, ModuleAccess, ExtraInfo

user = User.objects.get(username='fusion_admin')

roles_to_add = [
    ('hr', 'Human Resources', 'administrative'),
    ('admin', 'System Administrator', 'administrative'),
    ('faculty', 'Faculty', 'academic')
]

for role_name, full_name, role_type in roles_to_add:
    # 1. Create or get designation
    desig, created = Designation.objects.get_or_create(
        name=role_name,
        defaults={'full_name': full_name, 'type': role_type}
    )
    
    # 2. Grant module access
    module_access, created = ModuleAccess.objects.get_or_create(
        designation=desig.name,
        defaults={'hr': True}
    )
    if not module_access.hr:
        module_access.hr = True
        module_access.save()
        
    # 3. Assign designation to user
    HoldsDesignation.objects.get_or_create(
        user=user,
        working=user,
        designation=desig
    )

# Also update last_selected_role if desired, though we want them to have choices.
extra, _ = ExtraInfo.objects.get_or_create(user=user)
extra.last_selected_role = 'hr'
extra.save()

print("Successfully added roles hr, admin, and faculty to fusion_admin")
