"""Create or update test users for HR2 leave workflow."""

from datetime import date

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from applications.globals.models import DepartmentInfo, Designation, ExtraInfo, HoldsDesignation, ModuleAccess
from applications.hr2.models import Employee, LeaveBalance

class Command(BaseCommand):
    help = "Create or update test users with leave hierarchy roles"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('CREATING TEST USERS FOR LEAVE APPROVAL WORKFLOW'))
        self.stdout.write(self.style.SUCCESS('=' * 80))

        try:
            with transaction.atomic():
                # Step 1: Create departments
                self.stdout.write("\n[1/4] Creating departments...")
                departments = {}
                for dept_name in ["Computer Science", "Physics", "Chemistry"]:
                    dept, created = DepartmentInfo.objects.get_or_create(name=dept_name)
                    departments[dept_name] = dept
                    status = "Created" if created else "Exists"
                    self.stdout.write(f"  {status}: {dept_name}")

                # Step 2: Create designations
                self.stdout.write("\n[2/4] Setting up designations...")
                designations = {}
                desig_list = [
                    ("Faculty", "Faculty", "academic"),
                    ("Non-Teaching Staff", "Non-Teaching Staff", "administrative"),
                    ("Head of Department", "Head of Department", "academic"),
                    ("Dean", "Dean", "academic"),
                    ("Registrar", "Registrar", "administrative"),
                    ("Director", "Director", "administrative"),
                ]
                for short_name, full_name, desig_type in desig_list:
                    desig, created = Designation.objects.get_or_create(
                        name=short_name,
                        defaults={"full_name": full_name, "type": desig_type},
                    )
                    if not created:
                        changed = False
                        if desig.full_name != full_name:
                            desig.full_name = full_name
                            changed = True
                        if desig.type != desig_type:
                            desig.type = desig_type
                            changed = True
                        if changed:
                            desig.save(update_fields=["full_name", "type"])
                    designations[short_name] = desig
                    status = "Created" if created else "Exists"
                    self.stdout.write(f"  {status}: {short_name}")

                # Step 3: Create test users
                self.stdout.write("\n[3/4] Creating test users...")
                user_configs = [
                    ("faculty_user1", "Faculty", "Computer Science", "Faculty", "faculty"),
                    ("faculty_user2", "Faculty", "Physics", "Faculty", "faculty"),
                    ("staff_user1", "Non-Teaching Staff", "Computer Science", "Staff", "staff"),
                    ("hod_cse", "Head of Department", "Computer Science", "Faculty", "faculty"),
                    ("hod_physics", "Head of Department", "Physics", "Faculty", "faculty"),
                    ("dean_user", "Dean", "Computer Science", "Faculty", "faculty"),
                    ("registrar_user", "Registrar", "Computer Science", "Faculty", "staff"),
                    ("director_user", "Director", "Computer Science", "Faculty", "staff"),
                ]

                for username, role, dept_name, emp_type, user_type in user_configs:
                    user, user_created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            "email": f"{username}@fusion.edu.in",
                            "first_name": username.replace("_", " ").title(),
                            "is_staff": True,
                            "is_active": True,
                        },
                    )

                    # Always reset password to the expected test password.
                    user.email = f"{username}@fusion.edu.in"
                    user.is_staff = True
                    user.is_active = True
                    user.set_password("Test@123")
                    user.save()

                    dept = departments[dept_name]
                    designation = designations[role]

                    extra_info_defaults = {
                        "id": f"EI-HR2-{username.upper()[:12]}",
                        "user_type": user_type,
                        "department": dept,
                        "last_selected_role": role,
                    }
                    extra_info = ExtraInfo.objects.filter(user=user).first()
                    if not extra_info:
                        ExtraInfo.objects.create(user=user, **extra_info_defaults)
                    else:
                        extra_info.user_type = user_type
                        extra_info.department = dept
                        extra_info.last_selected_role = role
                        extra_info.save(update_fields=["user_type", "department", "last_selected_role"])

                    # Create Employee
                    employee, _ = Employee.objects.get_or_create(
                        id=user,
                        defaults={
                            "father_name": "Father",
                            "mother_name": "Mother",
                            "category": "General",
                            "caste": "General",
                            "home_state": "State",
                            "home_district": "District",
                            "full_address": "Fusion Campus",
                            "date_of_joining": date(2020, 1, 1),
                            "date_of_birth": date(1990, 1, 1),
                            "blood_group": "A+",
                            "phone_number": "9999999999",
                            "personal_email": f"{username}@fusion.edu.in",
                            "emergency_contact_number": "8888888888",
                            "emergency_contact_name": "Parent",
                            "employee_type": emp_type,
                        },
                    )
                    employee.employee_type = emp_type
                    employee.personal_email = f"{username}@fusion.edu.in"
                    employee.save(update_fields=["employee_type", "personal_email"])

                    HoldsDesignation.objects.get_or_create(
                        user=user,
                        working=user,
                        designation=designation,
                    )
                    LeaveBalance.objects.get_or_create(empid=employee)

                    status = "Created" if user_created else "Updated"
                    self.stdout.write(f"  {status}: {username} ({role})")

                self.stdout.write("\n[4/5] Enabling HR module access for test roles...")
                access_roles = {
                    "Head of Department",
                    "Dean",
                    "Registrar",
                    "Director",
                    "HR Admin",
                    "Faculty",
                    "Non-Teaching Staff",
                }
                for role_name in sorted(access_roles):
                    module_access, created = ModuleAccess.objects.get_or_create(designation=role_name)
                    if not module_access.hr:
                        module_access.hr = True
                        module_access.save(update_fields=["hr"])
                    status = "Created" if created else "Updated"
                    self.stdout.write(f"  {status}: {role_name} (hr=True)")

                # Step 4: Print summary
                self.stdout.write("\n[5/5] Setup complete!")
                self.stdout.write(self.style.SUCCESS("\n" + "=" * 80))
                self.stdout.write(self.style.SUCCESS("TEST USERS READY FOR LOGIN"))
                self.stdout.write(self.style.SUCCESS("=" * 80))

                self.stdout.write(self.style.WARNING("\nLOGIN CREDENTIALS:"))
                self.stdout.write(self.style.WARNING("-" * 80))
                for username, role, dept_name, _, _ in user_configs:
                    self.stdout.write(f"  Username: {username}")
                    self.stdout.write(f"    Role: {role} ({dept_name})")
                    self.stdout.write(f"    Password: Test@123")
                    self.stdout.write("")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
            import traceback

            traceback.print_exc()
