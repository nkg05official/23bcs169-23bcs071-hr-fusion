"""Setup test users and leave approval hierarchy for HR2 workflow tests."""

import os
from datetime import date

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Fusion.settings.development")

import django

django.setup()

from django.contrib.auth.models import User
from django.db import transaction

from applications.globals.models import DepartmentInfo, Designation, ExtraInfo, HoldsDesignation, ModuleAccess
from applications.hr2.models import ApprovalHierarchy, Employee, LeaveBalance, LeavePerYear


USER_CONFIGS = [
    ("faculty_user1", "Faculty", "Computer Science", "Faculty", "faculty"),
    ("faculty_user2", "Faculty", "Physics", "Faculty", "faculty"),
    ("staff_user1", "Non-Teaching Staff", "Computer Science", "Staff", "staff"),
    ("staff_user2", "Non-Teaching Staff", "Physics", "Staff", "staff"),
    ("hod_cse", "Head of Department", "Computer Science", "Faculty", "faculty"),
    ("hod_physics", "Head of Department", "Physics", "Faculty", "faculty"),
    ("dean_user", "Dean", "Computer Science", "Faculty", "faculty"),
    ("registrar_user", "Registrar", "Computer Science", "Faculty", "staff"),
    ("director_user", "Director", "Computer Science", "Faculty", "staff"),
    ("hr_admin", "HR Admin", "Computer Science", "Staff", "staff"),
    ("finance_user", "Finance", "Computer Science", "Staff", "staff"),
]


def upsert_departments():
    names = ["Computer Science", "Physics", "Chemistry", "Mathematics", "Mechanical Engineering"]
    departments = {}
    for name in names:
        dept, _ = DepartmentInfo.objects.get_or_create(name=name)
        departments[name] = dept
    return departments


def upsert_designations():
    configs = [
        ("Faculty", "Faculty", "academic"),
        ("Non-Teaching Staff", "Non-Teaching Staff", "administrative"),
        ("Head of Department", "Head of Department", "academic"),
        ("Dean", "Dean", "academic"),
        ("Registrar", "Registrar", "administrative"),
        ("Director", "Director", "administrative"),
        ("HR Admin", "HR Admin", "administrative"),
        ("Finance", "Finance", "administrative"),
    ]
    designations = {}
    for name, full_name, desig_type in configs:
        desig, created = Designation.objects.get_or_create(
            name=name,
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
        designations[name] = desig
    return designations


def upsert_users(departments, designations):
    created = []
    for username, role, dept_name, employee_type, user_type in USER_CONFIGS:
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": f"{username}@fusion.edu.in",
                "first_name": username.replace("_", " ").title(),
                "is_staff": True,
                "is_active": True,
            },
        )

        user.email = f"{username}@fusion.edu.in"
        user.is_staff = True
        user.is_active = True
        user.set_password("Test@123")
        user.save()

        department = departments[dept_name]
        designation = designations[role]

        extra_info = ExtraInfo.objects.filter(user=user).first()
        if not extra_info:
            ExtraInfo.objects.create(
                id=f"EI-HR2-{username.upper()[:12]}",
                user=user,
                user_type=user_type,
                department=department,
                last_selected_role=role,
            )
        else:
            extra_info.user_type = user_type
            extra_info.department = department
            extra_info.last_selected_role = role
            extra_info.save(update_fields=["user_type", "department", "last_selected_role"])

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
                "employee_type": employee_type,
            },
        )
        employee.employee_type = employee_type
        employee.personal_email = f"{username}@fusion.edu.in"
        employee.save(update_fields=["employee_type", "personal_email"])

        HoldsDesignation.objects.get_or_create(user=user, working=user, designation=designation)

        LeaveBalance.objects.get_or_create(empid=employee)
        LeavePerYear.objects.get_or_create(empid=employee)

        created.append((username, role, dept_name, "Created" if user_created else "Updated"))

    return created


def upsert_approval_hierarchy(departments, designations):
    configs = [
        ("leave", "CL_RH_Only", 1, "Head of Department", 3, True, False),
        ("leave", "SCL_HR_COL_VL", 1, "Head of Department", 3, True, True),
        ("leave", "SCL_HR_COL_VL", 2, "Dean", 3, True, True),
        ("leave", "SCL_HR_COL_VL", 3, "Registrar", 3, True, True),
        ("leave", "SCL_HR_COL_VL", 4, "Director", 5, True, False),
    ]

    target_departments = [departments["Computer Science"], departments["Physics"]]
    results = []

    for department in target_departments:
        for form_type, leave_type, level, role_name, sla_days, can_reject, can_forward in configs:
            hierarchy, created = ApprovalHierarchy.objects.get_or_create(
                form_type=form_type,
                leave_type=leave_type,
                approval_level=level,
                department=department,
                required_designation=designations[role_name],
                defaults={
                    "sla_days": sla_days,
                    "can_reject": can_reject,
                    "can_forward": can_forward,
                    "is_active": True,
                },
            )
            if not created:
                hierarchy.required_designation = designations[role_name]
                hierarchy.sla_days = sla_days
                hierarchy.can_reject = can_reject
                hierarchy.can_forward = can_forward
                hierarchy.is_active = True
                hierarchy.save(
                    update_fields=[
                        "required_designation",
                        "sla_days",
                        "can_reject",
                        "can_forward",
                        "is_active",
                    ]
                )
            results.append((department.name, leave_type, level, role_name, "Created" if created else "Updated"))

    return results


def upsert_module_access():
    roles = [
        "Head of Department",
        "Dean",
        "Registrar",
        "Director",
        "HR Admin",
        "Faculty",
        "Non-Teaching Staff",
    ]
    results = []
    for role in roles:
        access, created = ModuleAccess.objects.get_or_create(designation=role)
        if not access.hr:
            access.hr = True
            access.save(update_fields=["hr"])
        results.append((role, "Created" if created else "Updated"))
    return results


def main():
    print("=" * 80)
    print("SETTING UP LEAVE APPROVAL HIERARCHY AND TEST USERS")
    print("=" * 80)

    with transaction.atomic():
        print("\n[1/4] Departments")
        departments = upsert_departments()
        print(f"  Ready: {', '.join(sorted(departments.keys()))}")

        print("\n[2/4] Designations")
        designations = upsert_designations()
        print(f"  Ready: {', '.join(sorted(designations.keys()))}")

        print("\n[3/4] Users + Profiles")
        user_results = upsert_users(departments, designations)
        for username, role, dept, status in user_results:
            print(f"  {status}: {username} ({role}, {dept})")

        print("\n[4/5] Approval Hierarchy")
        hierarchy_results = upsert_approval_hierarchy(departments, designations)
        for dept, leave_type, level, role_name, status in hierarchy_results:
            print(f"  {status}: {dept} | {leave_type} | L{level} -> {role_name}")

        print("\n[5/5] Module Access (HR_USER)")
        module_access_results = upsert_module_access()
        for role, status in module_access_results:
            print(f"  {status}: {role} (hr=True)")

    print("\n" + "=" * 80)
    print("SETUP COMPLETE")
    print("=" * 80)
    print("Password for all users: Test@123")


if __name__ == "__main__":
    main()
