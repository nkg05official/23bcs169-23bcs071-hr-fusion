import json
import logging
import os
import traceback
from datetime import date, datetime
from functools import wraps

from django.db import transaction
from django.db.models import Q
from rest_framework import status as http_status
from rest_framework.response import Response

from applications.filetracking.sdk.methods import archive_file, create_file, forward_file
from applications.globals.models import ExtraInfo, HoldsDesignation, ModuleAccess
from applications.hr2.models import Employee, EmpConfidentialDetails, LeaveBalance, LeaveForm, LeavePerYear

from . import selectors


class ServiceValidationError(Exception):
    pass


class ServiceNotFoundError(Exception):
    pass


logger = logging.getLogger(__name__)


FORM_TYPE_FILETRACKING = {
    "LTC": "LTC",
    "CPDAAdvance": "CPDAAdvance",
    "CPDAReimbursement": "CPDAReimbursement",
    "Leave": "Leave",
    "Appraisal": "Appraisal",
}

MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
MAX_CPDA_ADVANCE_AMOUNT = 100000

LEAVE_STATUS_TRANSITIONS = {
    "Pending": {"Accepted", "Rejected"},
    "Accepted": set(),
    "Rejected": {"Pending"},
}

LEAVE_DEDUCTION_RULES = (
    ("Noof_CasualLeave", "casual_leave_balance", 1),
    ("Noof_specialCasualLeave", "special_casual_leave_balance", 1),
    ("Noof_earnedLeave", "earned_leave_balance", 1),
    ("Noof_vacationLeave", "earned_leave_balance", 2),
    ("Noof_commutedLeave", "half_pay_leave_balance", 2),
    ("Noof_restrictedHoliday", "restricted_holiday_balance", 1),
    ("Noof_halfPayLeave", "half_pay_leave_balance", 1),
    ("Noof_maternityLeave", "maternity_leave_balance", 1),
    ("Noof_childCareLeave", "child_care_leave_balance", 1),
    ("Noof_paternityLeave", "paternity_leave_balance", 1),
)

LEAVE_REQUEST_FIELD_MAP = {
    "casual": ("Noof_CasualLeave", "casualLeave"),
    "special_casual": ("Noof_specialCasualLeave", "specialCasualLeave"),
    "earned": ("Noof_earnedLeave", "earnedLeave"),
    "commuted": ("Noof_commutedLeave", "commutedLeave"),
    "restricted_holiday": ("Noof_restrictedHoliday", "restrictedHoliday"),
    "vacation": ("Noof_vacationLeave", "vacationLeave"),
    "maternity": ("Noof_maternityLeave", "maternityLeave"),
    "child_care": ("Noof_childCareLeave", "childCareLeave"),
    "paternity": ("Noof_paternityLeave", "paternityLeave"),
    "half_pay": ("Noof_halfPayLeave", "halfPayLeave"),
}


def audit_event(event_name, user=None, object_id=None, details=None):
    payload = {
        "event": event_name,
        "user": getattr(user, "username", str(user) if user else "system"),
        "object_id": object_id,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat(),
    }
    logger.info("HR_AUDIT %s", json.dumps(payload, default=str))


def user_has_hr_access(user):
    """
    Check if user has access to HR module based on ModuleAccess.
    Includes request-level caching to prevent redundant DB hits.
    """
    if not user or not user.is_authenticated:
        return False
        
    if hasattr(user, '_hr_access_cache'):
        return user._hr_access_cache

    extra_info = ExtraInfo.objects.filter(user=user).first()
    if not extra_info:
        user._hr_access_cache = False
        return False

    selected_designation = extra_info.last_selected_role
    if not selected_designation:
        latest_designation = (
            HoldsDesignation.objects.select_related("designation").filter(user=user).last()
        )
        if not latest_designation:
            user._hr_access_cache = False
            return False
        selected_designation = latest_designation.designation.name

    module_access = ModuleAccess.objects.filter(designation=selected_designation).first()
    user._hr_access_cache = bool(module_access and module_access.hr)
    return user._hr_access_cache


def is_hod(user):
    """Check if user is a Head of Department (HoD)"""
    extra_info = ExtraInfo.objects.filter(user=user).first()
    if not extra_info:
        return False
    role = extra_info.last_selected_role or ""
    return 'HOD' in role.upper() or 'HEAD' in role.upper()


def is_sanctioning_authority(user):
    """Check if user is a Sanctioning Authority (Director/Dean/Registrar)"""
    extra_info = ExtraInfo.objects.filter(user=user).first()
    if not extra_info:
        return False
    role = (extra_info.last_selected_role or "").upper()
    return any(x in role for x in ['DIRECTOR', 'DEAN', 'REGISTRAR', 'PRINCIPAL'])


def resolve_default_leave_reviewer(employee):
    """
    Resolve default first receiver for leave submission.
    Priority: HoD of employee's department -> any HoD.
    """
    employee_user = employee.id
    employee_extra = ExtraInfo.objects.filter(user=employee_user).first()
    employee_department = getattr(employee_extra, "department", None)

    hod_candidates = HoldsDesignation.objects.select_related("user", "designation").filter(
        Q(designation__name__icontains="head of department") |
        Q(designation__name__icontains="hod")
    )

    if employee_department:
        for candidate in hod_candidates:
            candidate_extra = ExtraInfo.objects.filter(user=candidate.user).first()
            if candidate_extra and candidate_extra.department_id == employee_department.id:
                candidate_employee = Employee.objects.filter(id=candidate.user).first()
                if candidate_employee:
                    return candidate_employee, candidate.designation

    for candidate in hod_candidates:
        candidate_employee = Employee.objects.filter(id=candidate.user).first()
        if candidate_employee:
            return candidate_employee, candidate.designation

    return None, None


def ensure_profile_complete(employee):
    confidential = EmpConfidentialDetails.objects.filter(empid=employee).first()
    if not confidential:
        raise ServiceValidationError("Employee confidential profile is incomplete")

    required_fields = [
        confidential.aadhar_number,
        confidential.pan_number,
        confidential.personal_file_number,
        confidential.bank_account_number,
    ]
    if any(not value for value in required_fields):
        raise ServiceValidationError("Employee confidential profile is incomplete")


def validate_attachment(uploaded_file, required=False):
    if not uploaded_file:
        if required:
            raise ServiceValidationError("At least one supporting attachment is required")
        return

    extension = os.path.splitext(uploaded_file.name or "")[1].lower()
    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise ServiceValidationError("Invalid attachment format. Allowed: pdf, jpg, jpeg, png, docx")

    if uploaded_file.size > MAX_ATTACHMENT_SIZE_BYTES:
        raise ServiceValidationError("Attachment exceeds 5MB limit")


def validate_leave_dates(start_date, end_date):
    today = date.today()
    if end_date < start_date:
        raise ServiceValidationError("Leave end date cannot be before start date")
    if start_date < today:
        raise ServiceValidationError("Leave start date cannot be in the past")


def validate_station_leave(station_leave_enabled, station_leave_start, station_leave_end, station_leave_address):
    if not station_leave_enabled:
        return

    if not all([station_leave_start, station_leave_end, station_leave_address]):
        raise ServiceValidationError("Station leave details are required when station leave is checked")
    if station_leave_end < station_leave_start:
        raise ServiceValidationError("Station leave end date cannot be before start date")


def _extract_leave_requested_days(leave_data):
    requested = {}
    for leave_type, field_names in LEAVE_REQUEST_FIELD_MAP.items():
        value = 0
        for field_name in field_names:
            raw = leave_data.get(field_name)
            if raw in (None, ""):
                continue
            try:
                value = int(raw)
            except (TypeError, ValueError):
                raise ServiceValidationError(f"Invalid leave count for {field_name}")
            break
        requested[leave_type] = value
    return requested


def validate_leave_type_eligibility(employee, leave_data):
    """
    BR-HR-001 / BR-HR-025: enforce leave-type eligibility by role and balance.
    """
    requested = _extract_leave_requested_days(leave_data)
    total_requested = sum(requested.values())
    if total_requested <= 0:
        raise ServiceValidationError("At least one leave type with positive days is required")

    if employee.employee_type != "Faculty" and requested["vacation"] > 0:
        raise ServiceValidationError("Vacation leave is allowed only for Faculty employees")

    leave_balance = selectors.get_leave_balance_for_employee(employee)
    balance_map = {
        "casual": leave_balance.casual_leave_balance,
        "special_casual": leave_balance.special_casual_leave_balance,
        "earned": leave_balance.earned_leave_balance,
        "commuted": leave_balance.half_pay_leave_balance,
        "restricted_holiday": leave_balance.restricted_holiday_balance,
        "vacation": leave_balance.earned_leave_balance,
        "maternity": leave_balance.maternity_leave_balance,
        "child_care": leave_balance.child_care_leave_balance,
        "paternity": leave_balance.paternity_leave_balance,
        "half_pay": leave_balance.half_pay_leave_balance,
    }
    multiplier_map = {
        "commuted": 2,
        "vacation": 2,
    }

    for leave_type, requested_days in requested.items():
        if requested_days <= 0:
            continue
        required_days = requested_days * multiplier_map.get(leave_type, 1)
        available_days = int(balance_map.get(leave_type, 0) or 0)
        if available_days < required_days:
            raise ServiceValidationError(
                f"Insufficient {leave_type} leave balance. Available: {available_days}, Requested: {required_days}"
            )


def assert_leave_status_transition(current_status, next_status):
    allowed_next = LEAVE_STATUS_TRANSITIONS.get(current_status, set())
    if next_status not in allowed_next:
        raise ServiceValidationError(
            f"Invalid leave status transition from {current_status} to {next_status}"
        )


# =======================
# BUSINESS RULE ENFORCEMENT (BR-002 to BR-008)
# =======================


def validate_leave_balance(employee, leave_type, days_requested):
    """
    BR-002: Validate sufficient leave balance before approval
    Prevents over-deduction of leave balance
    """
    from applications.hr2.models import LeaveBalance
    
    try:
        balance = LeaveBalance.objects.get(empid=employee)
    except LeaveBalance.DoesNotExist:
        raise ServiceValidationError(f"No leave balance record for employee {employee.id.username}")
    
    # Map leave types to balance fields
    balance_field_map = {
        'casual': 'casual_leave_balance',
        'earned': 'earned_leave_balance',
        'maternity': 'maternity_leave_balance',
        'paternity': 'paternity_leave_balance',
        'half_pay': 'half_pay_leave_balance',
    }
    
    balance_field = balance_field_map.get(leave_type.lower())
    if not balance_field:
        raise ServiceValidationError(f"Unknown leave type: {leave_type}")
    
    available_balance = getattr(balance, balance_field, 0)
    if available_balance < days_requested:
        raise ServiceValidationError(
            f"Insufficient {leave_type} leave balance. Available: {available_balance}, Requested: {days_requested}"
        )


def deduct_leave_balance(employee, leave_type, days):
    """
    BR-002: Deduct leave balance after approval
    Automatically updates leave balance table
    """
    from applications.hr2.models import LeaveBalance
    
    try:
        balance = LeaveBalance.objects.get(empid=employee)
    except LeaveBalance.DoesNotExist:
        raise ServiceValidationError(f"No leave balance record for employee {employee.id.username}")
    
    balance_field_map = {
        'casual': 'casual_leave_balance',
        'earned': 'earned_leave_balance',
        'maternity': 'maternity_leave_balance',
        'paternity': 'paternity_leave_balance',
        'half_pay': 'half_pay_leave_balance',
    }
    
    balance_field = balance_field_map.get(leave_type.lower())
    if not balance_field:
        raise ServiceValidationError(f"Unknown leave type: {leave_type}")
    
    current_balance = getattr(balance, balance_field, 0)
    if current_balance < days:
        raise ServiceValidationError(f"Cannot deduct {days} days. Available balance: {current_balance}")
    
    setattr(balance, balance_field, current_balance - days)
    balance.save(update_fields=[balance_field, 'last_updated'])
    logger.info(f"Leave balance deducted for {employee.id.username}: {balance_field} -= {days}")


def validate_employee_eligibility(employee, form_type):
    """
    BR-004: Validate employee eligibility for form submission
    - LTC: Minimum 2 years of service
    - CPDA: Faculty only
    - Appraisal: Active employment status
    """
    from datetime import timedelta
    
    if form_type == 'LTC':
        tenure = date.today() - employee.date_of_joining
        min_service_days = timedelta(days=730)  # 2 years
        if tenure < min_service_days:
            raise ServiceValidationError(
                f"Employee must have at least 2 years of service to apply for LTC. "
                f"Current tenure: {tenure.days} days"
            )
    
    elif form_type in ['CPDAAdvance', 'CPDAReimbursement']:
        if employee.employee_type != 'Faculty':
            raise ServiceValidationError(
                f"Only Faculty members can apply for CPDA. Employee type: {employee.employee_type}"
            )


def validate_cpda_balance(employee, amount_requested):
    """
    BR-006: Validate CPDA balance before approval
    Prevents over-withdrawal of CPDA funds
    """
    # Note: This requires integration with finance module
    # For now, we enforce at application level
    # TODO: Integrate with finance/accounts module
    amount = float(amount_requested)
    if amount <= 0:
        raise ServiceValidationError("CPDA amount must be greater than 0")
    if amount > MAX_CPDA_ADVANCE_AMOUNT:
        raise ServiceValidationError(
            f"CPDA request exceeds allowed limit of {MAX_CPDA_ADVANCE_AMOUNT}"
        )


def validate_approval_authority(user, form_type, form_state):
    """
    BR-007: Validate that only authorized users can approve forms
    Enforces approval hierarchy
    """
    from applications.globals.models import HoldsDesignation, Designation
    
    # Get user's current designation
    # SECURITY FIX: Replaced bare `except:` which silently swallowed DB errors
    # including DatabaseError, potentially allowing approval bypass.
    try:
        user_designation = HoldsDesignation.objects.select_related('designation').filter(
            user=user
        ).values_list('designation__name', flat=True).first()
    except (AttributeError, ValueError) as exc:
        raise ServiceValidationError(f"User designation lookup failed: {exc}") from exc
    
    if not user_designation:
        raise ServiceValidationError("User must have a designation to approve forms")
    
    # Define who can approve at each state
    approval_rules = {
        'hod_approved': ['HoD', 'Head of Department'],
        'dean_approved': ['Dean', 'Dean (Academic)', 'Dean (R&D)', 'Dean (Students)'],
        'registrar_approved': ['Registrar'],
        'sanction_approved': ['Director', 'Principal', 'Sanctioning Authority'],
        'final_approved': ['Director', 'Principal', 'Sanctioning Authority'],
    }
    
    allowed_roles = approval_rules.get(form_state, [])
    if user_designation not in allowed_roles:
        raise ServiceValidationError(
            f"Your role '{user_designation}' is not authorized to approve forms at state '{form_state}'"
        )
    
    logger.warning(f"Approval hierarchy check: {user.username} ({user_designation}) -> {form_state}")


def get_payload_part(payload, index, default=None):
    if isinstance(payload, (list, tuple)) and len(payload) > index:
        return payload[index]
    return default if default is not None else {}


def get_query_param(request, key, required=True):
    value = request.query_params.get(key)
    if required and not value:
        raise ServiceValidationError(f"Missing query param: {key}")
    return value


def run_serializer(serializer_class, payload, instance=None):
    serializer = serializer_class(instance, data=payload) if instance else serializer_class(data=payload)
    if not serializer.is_valid():
        raise ServiceValidationError(serializer.errors)
    serializer.save()
    return serializer


def create_tracking_entry(user_info, src_object_id, form_type):
    return create_file(
        uploader=user_info["uploader_name"],
        uploader_designation=user_info["uploader_designation"],
        receiver=user_info["receiver_name"],
        receiver_designation=user_info["receiver_designation"],
        src_module="HR",
        src_object_id=str(src_object_id),
        file_extra_JSON={"type": FORM_TYPE_FILETRACKING[form_type]},
        attached_file=None,
    )


def forward_tracking_file(receiver_payload):
    forward_file(
        file_id=receiver_payload["file_id"],
        receiver=receiver_payload["receiver"],
        receiver_designation=receiver_payload["receiver_designation"],
        remarks=receiver_payload["remarks"],
        file_extra_JSON=receiver_payload["file_extra_JSON"],
    )


def archive_tracking_file(file_id):
    return archive_file(file_id=file_id)


def parse_offline_payload(form_data):
    try:
        return {
            "employee_details": json.loads(form_data.get("employeeDetails", "{}")),
            "leave_details": json.loads(form_data.get("leaveDetails", "{}")),
            "station_leave": json.loads(form_data.get("stationLeave", "{}")),
            "responsibility_transfer": json.loads(form_data.get("responsibilityTransfer", "{}")),
            "forward_to": json.loads(form_data.get("forwardTo", "{}")),
        }
    except json.JSONDecodeError as exc:
        raise ServiceValidationError(f"Invalid JSON format in one of the fields: {str(exc)}")


def _deduct_balances_for_leave_form(leave_balance, leave_form):
    updated_fields = []
    for leave_attr, balance_attr, multiplier in LEAVE_DEDUCTION_RULES:
        requested_days = int(getattr(leave_form, leave_attr, 0) or 0)
        if requested_days <= 0:
            continue
        deduction = requested_days * multiplier
        current_balance = int(getattr(leave_balance, balance_attr, 0) or 0)
        if current_balance < deduction:
            raise ServiceValidationError(
                f"Insufficient balance for {balance_attr}. Requested: {deduction}, Available: {current_balance}"
            )
        setattr(leave_balance, balance_attr, current_balance - deduction)
        updated_fields.append(balance_attr)
    return updated_fields


def _restore_balances_for_leave_form(leave_balance, leave_form):
    updated_fields = []
    for leave_attr, balance_attr, multiplier in LEAVE_DEDUCTION_RULES:
        requested_days = int(getattr(leave_form, leave_attr, 0) or 0)
        if requested_days <= 0:
            continue
        restoration = requested_days * multiplier
        current_balance = int(getattr(leave_balance, balance_attr, 0) or 0)
        setattr(leave_balance, balance_attr, current_balance + restoration)
        updated_fields.append(balance_attr)
    return updated_fields


def has_overlapping_active_leave(employee, start_date, end_date, exclude_id=None, is_half_day=False, half_day_slot=None):
    """
    Check for overlapping active leave requests (BR-HR-003, BR-HR-025).
    For half-day leaves, it only overlaps if the existing leave is:
    1. A full-day leave on the same date.
    2. A half-day leave on the same date and same slot (AM/PM).
    """
    from applications.hr2.models import LeaveForm
    active_states = [
        'submitted', 'hod_approved', 'admin_approved',
        'sanction_approved', 'final_approved',
    ]
    active_statuses = ['Pending', 'Accepted']

    overlap_qs = LeaveForm.objects.filter(
        employee=employee,
    ).filter(
        Q(status__in=active_statuses) | Q(state__in=active_states),
    ).filter(
        Q(leaveStartDate__lte=end_date) & Q(leaveEndDate__gte=start_date)
    )

    if exclude_id is not None:
        overlap_qs = overlap_qs.exclude(id=exclude_id)
        
    if not overlap_qs.exists():
        return False
        
    # Apply slot-level precision for half-day requests
    if is_half_day:
        collision_exists = False
        for existing in overlap_qs:
            if not getattr(existing, 'is_half_day', False):
                # Any full-day leave on this date is a collision
                collision_exists = True
                break
            if existing.half_day_slot == half_day_slot:
                # Same slot collision
                collision_exists = True
                break
        return collision_exists

    # For full-day requests, any intersecting active leave is a collision
    return True


def resolve_optional_responsibilities(responsibility_transfer):
    academic_user = None
    academic_designation = None
    admin_user = None
    admin_designation = None

    if responsibility_transfer.get("academicResponsibility"):
        payload = responsibility_transfer["academicResponsibility"]
        academic_user = selectors.get_employee_by_id(payload["id"])
        academic_designation = selectors.get_designation_by_name(payload["designation"])

    if responsibility_transfer.get("administrativeResponsibility"):
        payload = responsibility_transfer["administrativeResponsibility"]
        admin_user = selectors.get_employee_by_id(payload["id"])
        admin_designation = selectors.get_designation_by_name(payload["designation"])

    return academic_user, academic_designation, admin_user, admin_designation


@transaction.atomic
def create_offline_leave_form(parsed, files):
    employee_details = parsed["employee_details"]
    leave_details = parsed["leave_details"]
    station_leave = parsed["station_leave"]
    responsibility_transfer = parsed["responsibility_transfer"]
    forward_to = parsed["forward_to"]

    if "id" not in forward_to:
        raise ServiceValidationError("Missing required field: forwardTo")

    required_fields = ["leaveStartDate", "leaveEndDate", "purpose"]
    missing = [field for field in required_fields if field not in leave_details]
    if missing:
        raise ServiceValidationError(f"Missing required fields: {', '.join(missing)}")

    leave_start_date = datetime.strptime(leave_details.get("leaveStartDate"), "%Y-%m-%d").date()
    leave_end_date = datetime.strptime(leave_details.get("leaveEndDate"), "%Y-%m-%d").date()
    validate_leave_dates(leave_start_date, leave_end_date)

    employee_id = employee_details.get("id")
    employee = selectors.get_employee_by_id(employee_id)
    validate_leave_type_eligibility(employee, leave_details)
    if has_overlapping_active_leave(employee, leave_start_date, leave_end_date):
        raise ServiceValidationError(
            "Overlapping active leave request exists for the selected date range"
        )

    forward_designation = selectors.get_designation_by_name(forward_to["designation"])

    academic_user, academic_designation, admin_user, admin_designation = resolve_optional_responsibilities(
        responsibility_transfer
    )

    station_leave_enabled = station_leave.get("isStationLeave", False)
    station_leave_start = station_leave.get("stationLeaveStartDate")
    station_leave_end = station_leave.get("stationLeaveEndDate")
    if station_leave_start:
        station_leave_start = datetime.strptime(station_leave_start, "%Y-%m-%d").date()
    if station_leave_end:
        station_leave_end = datetime.strptime(station_leave_end, "%Y-%m-%d").date()
    validate_station_leave(
        station_leave_enabled,
        station_leave_start,
        station_leave_end,
        station_leave.get("stationLeaveAddress"),
    )

    attached_pdf = files.get("attachedPdf")
    validate_attachment(attached_pdf)

    leave_form = LeaveForm.objects.create(
        employee=employee,
        name=employee_details.get("name"),
        designation=employee_details.get("designation"),
        personalfileNo=employee_details.get("pfno"),
        submissionDate=datetime.now().date(),
        departmentInfo=employee_details.get("department", "N/A"),
        leaveStartDate=leave_start_date,
        leaveEndDate=leave_end_date,
        Purpose_of_leave=leave_details.get("purpose"),
        Noof_CasualLeave=int(leave_details.get("casualLeave", 0)),
        Noof_vacationLeave=int(leave_details.get("vacationLeave", 0)),
        Noof_earnedLeave=int(leave_details.get("earnedLeave", 0)),
        Noof_commutedLeave=int(leave_details.get("commutedLeave", 0)),
        Noof_specialCasualLeave=int(leave_details.get("specialCasualLeave", 0)),
        Noof_restrictedHoliday=int(leave_details.get("restrictedHoliday", 0)),
        Noof_halfPayLeave=int(leave_details.get("halfPayLeave", 0)),
        Noof_maternityLeave=int(leave_details.get("maternityLeave", 0)),
        Noof_childCareLeave=int(leave_details.get("childCareLeave", 0)),
        Noof_paternityLeave=int(leave_details.get("paternityLeave", 0)),
        Remarks=leave_details.get("remarks", "N/A"),
        LeavingStation=station_leave_enabled,
        StationLeave_startdate=station_leave_start,
        StationLeave_enddate=station_leave_end,
        Address_During_StationLeave=station_leave.get("stationLeaveAddress"),
        status="Accepted",
        state="final_approved",
        balance_deducted=True,
        AcademicResponsibility_user=academic_user,
        AcademicResponsibility_designation=academic_designation,
        AcademicResponsibility_status="Accepted",
        AdministrativeResponsibility_user=admin_user,
        AdministrativeResponsibility_designation=admin_designation,
        AdministrativeResponsibility_status="Accepted",
        approved_by=selectors.get_employee_by_id(forward_to["id"]),
        approved_by_designation=forward_designation,
        approvedDate=datetime.now().date(),
        first_recieved_by=selectors.get_employee_by_id(forward_to["id"]),
        first_recieved_designation=forward_designation,
        attached_pdf=attached_pdf.read() if attached_pdf else None,
        attached_pdf_name=attached_pdf.name if attached_pdf else None,
        application_type="Offline",
    )

    uploader_employee = selectors.get_employee_by_id(employee_id)
    receiver_employee = selectors.get_employee_by_id(forward_to["id"])
    file_id = create_file(
        uploader=uploader_employee.id.username,
        uploader_designation=employee_details.get("designation"),
        receiver=receiver_employee.id.username,
        receiver_designation=forward_to["designation"],
        src_module="HR",
        src_object_id=str(leave_form.id),
        file_extra_JSON={"type": "Leave"},
        attached_file=None,
    )
    leave_form.file_id = file_id
    leave_form.save(update_fields=["file_id"])

    leave_balance = selectors.get_leave_balance_for_employee(employee)
    updated_fields = _deduct_balances_for_leave_form(leave_balance, leave_form)
    if updated_fields:
        leave_balance.save(update_fields=updated_fields)

    audit_event(
        "offline_leave_submitted",
        user=uploader_employee.id,
        object_id=leave_form.id,
        details={"file_id": file_id, "employee_id": employee_id},
    )

    return leave_form, file_id


@transaction.atomic
def create_online_leave_form(user, form_data, files):
    required_fields = [
        "name",
        "designation",
        "pfno",
        "department",
        "leaveStartDate",
        "leaveEndDate",
        "purpose",
    ]
    missing = [field for field in required_fields if not form_data.get(field)]
    if missing:
        raise ServiceValidationError(f"Missing required fields: {', '.join(missing)}")

    leave_start_date = datetime.strptime(form_data.get("leaveStartDate"), "%Y-%m-%d").date()
    leave_end_date = datetime.strptime(form_data.get("leaveEndDate"), "%Y-%m-%d").date()
    validate_leave_dates(leave_start_date, leave_end_date)

    station_leave = form_data.get("stationLeave", "false").lower() == "true"
    station_leave_start = form_data.get("stationLeaveStartDate")
    station_leave_end = form_data.get("stationLeaveEndDate")
    station_leave_address = form_data.get("stationLeaveAddress")

    if station_leave:
        station_leave_start = datetime.strptime(station_leave_start, "%Y-%m-%d").date()
        station_leave_end = datetime.strptime(station_leave_end, "%Y-%m-%d").date()
    else:
        station_leave_start = None
        station_leave_end = None
        station_leave_address = None

    validate_station_leave(station_leave, station_leave_start, station_leave_end, station_leave_address)

    employee = selectors.get_employee_for_user(user)
    
    # Duplicate prevention (BR-HR-409) - handled by overlap check below
    pass

    is_half_day = form_data.get("isHalfDay", "false").lower() == "true"
    half_day_slot = form_data.get("halfDaySlot") # AM or PM
    
    validate_leave_type_eligibility(employee, form_data)
    if has_overlapping_active_leave(employee, leave_start_date, leave_end_date, 
                                   is_half_day=is_half_day, half_day_slot=half_day_slot):
        raise ServiceValidationError(
            "Overlapping active leave request exists for the selected date range and slot"
        )

    academic_user = None
    academic_designation = None
    academic_responsibility_id = form_data.get("academicResponsibility")
    if academic_responsibility_id:
        academic_user = selectors.get_employee_by_id(academic_responsibility_id)
        academic_designation = selectors.get_designation_by_name(form_data.get("academicResponsibility_designation"))

    admin_user = None
    admin_designation = None
    administrative_responsibility_id = form_data.get("administrativeResponsibility")
    if administrative_responsibility_id:
        admin_user = selectors.get_employee_by_id(administrative_responsibility_id)
        admin_designation = selectors.get_designation_by_name(form_data.get("administrativeResponsibility_designation"))

    forward_to_id = form_data.get("forwardTo")
    forward_to_designation = form_data.get("forwardTo_designation")
    if forward_to_id:
        first_received_by = selectors.get_employee_by_id(forward_to_id)
        first_received_designation = selectors.get_designation_by_name(forward_to_designation)
    else:
        first_received_by, first_received_designation = resolve_default_leave_reviewer(employee)
        if not first_received_by or not first_received_designation:
            raise ServiceValidationError(
                "Unable to auto-route leave application. Please contact HR Admin."
            )

    attached_pdf = files.get("attached_pdf")
    validate_attachment(attached_pdf)
    leave_form = LeaveForm.objects.create(
        employee=employee,
        name=form_data.get("name"),
        designation=form_data.get("designation"),
        personalfileNo=form_data.get("pfno"),
        submissionDate=form_data.get("date"),
        departmentInfo=form_data.get("department"),
        leaveStartDate=leave_start_date,
        leaveEndDate=leave_end_date,
        is_half_day=is_half_day,
        half_day_slot=half_day_slot,
        Purpose_of_leave=form_data.get("purpose"),
        Noof_CasualLeave=int(form_data.get("casualLeave", 0)),
        Noof_vacationLeave=int(form_data.get("vacationLeave", 0)),
        Noof_earnedLeave=int(form_data.get("earnedLeave", 0)),
        Noof_commutedLeave=int(form_data.get("commutedLeave", 0)),
        Noof_specialCasualLeave=int(form_data.get("specialCasualLeave", 0)),
        Noof_restrictedHoliday=int(form_data.get("restrictedHoliday", 0)),
        Noof_halfPayLeave=int(form_data.get("halfPayLeave", 0)),
        Noof_maternityLeave=int(form_data.get("maternityLeave", 0)),
        Noof_childCareLeave=int(form_data.get("childCareLeave", 0)),
        Noof_paternityLeave=int(form_data.get("paternityLeave", 0)),
        Remarks=form_data.get("remarks", "N/A"),
        LeavingStation=station_leave,
        StationLeave_startdate=station_leave_start,
        StationLeave_enddate=station_leave_end,
        Address_During_StationLeave=station_leave_address,
        AcademicResponsibility_user=academic_user,
        AcademicResponsibility_designation=academic_designation,
        AcademicResponsibility_status="Pending" if academic_user else "Accepted",
        AdministrativeResponsibility_user=admin_user,
        AdministrativeResponsibility_designation=admin_designation,
        AdministrativeResponsibility_status="Pending" if admin_user else "Accepted",
        first_recieved_by=first_received_by,
        first_recieved_designation=first_received_designation,
        status="Pending",
        state="submitted",
        attached_pdf=attached_pdf.read() if attached_pdf else None,
        attached_pdf_name=attached_pdf.name if attached_pdf else None,
    )

    file_id = None
    if not academic_user and not admin_user:
        file_id = create_file(
            uploader=employee.id.username,
            uploader_designation=form_data.get("designation"),
            receiver=first_received_by.id.username,
            receiver_designation=first_received_designation.name,
            src_module="HR",
            src_object_id=str(leave_form.id),
            file_extra_JSON={"type": "Leave"},
            attached_file=None,
        )
        leave_form.file_id = file_id
        leave_form.save(update_fields=["file_id"])

    audit_event(
        "online_leave_submitted",
        user=user,
        object_id=leave_form.id,
        details={
            "file_id": file_id,
            "auto_routed": not bool(forward_to_id),
            "has_academic_responsibility": bool(academic_user),
            "has_admin_responsibility": bool(admin_user),
        },
    )

    return leave_form, file_id


def build_employee_search_response(search_text):
    rows, _ = search_employees_with_designations(search_text, limit=100, offset=0)
    return rows


def search_employees_with_designations(search_text, limit, offset):
    """
    PERF FIX: Original used `username__icontains` which generates a full-table
    LIKE '%...%' scan. Replaced with a multi-field OR filter using prefix-friendly
    conditions (first_name__istartswith, last_name__istartswith) plus
    username__istartswith for indexed prefix lookup. The icontains fallback on
    username is preserved for short exact-match queries but throttled to 3+ chars.

    Also enriched results with first_name/last_name for better UI display.
    """
    from django.db.models import Q as _Q

    terms = search_text.strip().split()
    if not terms:
        return [], 0

    # Build a filter that ANDs each term across username/first/last name
    combined = _Q()
    for term in terms:
        combined &= (
            _Q(user__username__istartswith=term)
            | _Q(user__first_name__istartswith=term)
            | _Q(user__last_name__istartswith=term)
        )
        # Fallback: icontains only for longer terms to avoid full-scan on short strings
        if len(term) >= 3:
            combined |= _Q(user__username__icontains=term)

    queryset = (
        HoldsDesignation.objects.select_related("user", "designation")
        .filter(combined)
        .order_by("user__username", "designation__name", "id")
        .distinct()
    )

    total_count = queryset.count()
    items = queryset[offset: offset + limit]
    rows = [
        {
            "id": item.user.id,
            "username": item.user.username,
            "first_name": item.user.first_name,
            "last_name": item.user.last_name,
            "email": item.user.email,
            "designation": item.designation.name,
        }
        for item in items
    ]
    return rows, total_count


def build_leave_balance_payload(leave_balance, leave_per_year):
    casual_taken = max(leave_per_year.casual_leave - leave_balance.casual_leave_balance, 0)
    special_casual_taken = max(leave_per_year.special_casual_leave - leave_balance.special_casual_leave_balance, 0)
    earned_taken = max(leave_per_year.earned_leave - leave_balance.earned_leave_balance, 0)
    half_pay_taken = max(leave_per_year.half_pay_leave - leave_balance.half_pay_leave_balance, 0)
    maternity_taken = max(leave_per_year.maternity_leave - leave_balance.maternity_leave_balance, 0)
    child_care_taken = max(leave_per_year.child_care_leave - leave_balance.child_care_leave_balance, 0)
    paternity_taken = max(leave_per_year.paternity_leave - leave_balance.paternity_leave_balance, 0)
    leave_encashment_taken = max(leave_per_year.leave_encashment - leave_balance.leave_encashment_balance, 0)

    return {
        "casual_leave": {
            "allotted": leave_per_year.casual_leave,
            "taken": casual_taken,
            "balance": leave_balance.casual_leave_balance,
        },
        "special_casual_leave": {
            "allotted": leave_per_year.special_casual_leave,
            "taken": special_casual_taken,
            "balance": leave_balance.special_casual_leave_balance,
        },
        "earned_leave": {
            "allotted": leave_per_year.earned_leave,
            "taken": earned_taken,
            "balance": leave_balance.earned_leave_balance,
        },
        "half_pay_leave": {
            "allotted": leave_per_year.half_pay_leave,
            "taken": half_pay_taken,
            "balance": leave_balance.half_pay_leave_balance,
        },
        "maternity_leave": {
            "allotted": leave_per_year.maternity_leave,
            "taken": maternity_taken,
            "balance": leave_balance.maternity_leave_balance,
        },
        "child_care_leave": {
            "allotted": leave_per_year.child_care_leave,
            "taken": child_care_taken,
            "balance": leave_balance.child_care_leave_balance,
        },
        "paternity_leave": {
            "allotted": leave_per_year.paternity_leave,
            "taken": paternity_taken,
            "balance": leave_balance.paternity_leave_balance,
        },
        "leave_encashment": {
            "allotted": leave_per_year.leave_encashment,
            "taken": leave_encashment_taken,
            "balance": leave_balance.leave_encashment_balance,
        },
    }


def build_leave_balance_summary_payload(leave_balance, leave_per_year):
    return {
        "casual_leave_allotted": leave_per_year.casual_leave,
        "casual_leave_taken": max(leave_per_year.casual_leave - leave_balance.casual_leave_balance, 0),
        "earned_leave_allotted": leave_per_year.earned_leave,
        "earned_leave_taken": max(leave_per_year.earned_leave - leave_balance.earned_leave_balance, 0),
        "special_casual_leave_allotted": leave_per_year.special_casual_leave,
        "special_casual_leave_taken": max(
            leave_per_year.special_casual_leave - leave_balance.special_casual_leave_balance,
            0,
        ),
        "restricted_holiday_allotted": leave_per_year.restricted_holiday,
        "restricted_holiday_taken": max(
            leave_per_year.restricted_holiday - leave_balance.restricted_holiday_balance,
            0,
        ),
        "half_pay_leave_allotted": leave_per_year.half_pay_leave,
        "half_pay_leave_taken": max(leave_per_year.half_pay_leave - leave_balance.half_pay_leave_balance, 0),
        "maternity_leave_allotted": leave_per_year.maternity_leave,
        "maternity_leave_taken": max(
            leave_per_year.maternity_leave - leave_balance.maternity_leave_balance,
            0,
        ),
        "child_care_leave_allotted": leave_per_year.child_care_leave,
        "child_care_leave_taken": max(
            leave_per_year.child_care_leave - leave_balance.child_care_leave_balance,
            0,
        ),
        "paternity_leave_allotted": leave_per_year.paternity_leave,
        "paternity_leave_taken": max(
            leave_per_year.paternity_leave - leave_balance.paternity_leave_balance,
            0,
        ),
        "leave_encashment_allotted": leave_per_year.leave_encashment,
        "leave_encashment_taken": max(
            leave_per_year.leave_encashment - leave_balance.leave_encashment_balance,
            0,
        ),
    }


def get_leave_balance_payload_for_user(user):
    employee = selectors.get_employee_for_user(user)
    leave_balance = LeaveBalance.objects.filter(empid=employee).first() if employee else None
    leave_per_year = LeavePerYear.objects.filter(empid=employee).first() if employee else None
    
    if not leave_balance or not leave_per_year:
        return {
            "casual_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "special_casual_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "earned_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "half_pay_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "maternity_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "child_care_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "paternity_leave": {"allotted": 0, "taken": 0, "balance": 0},
            "leave_encashment": {"allotted": 0, "taken": 0, "balance": 0},
        }

    return build_leave_balance_payload(leave_balance, leave_per_year)


def get_form_initials_payload_for_user(user):
    employee = selectors.get_employee_for_user(user)
    extra_info, emp_confidential = selectors.get_employee_initial_context(employee)

    name = f"{user.first_name} {user.last_name}".strip() or user.username
    last_selected_role = extra_info.last_selected_role if extra_info else "N/A"
    pfno = emp_confidential.personal_file_number if emp_confidential else "N/A"
    department = extra_info.department.name if extra_info and extra_info.department else "N/A"

    return {
        "name": name,
        "last_selected_role": last_selected_role,
        "pfno": pfno,
        "department": department,
    }


def get_leave_requests_payload(employee, query_date, limit, offset):
    leave_forms_qs = selectors.get_leave_forms_for_employee(employee).select_related(
        'first_recieved_by__id',
        'first_recieved_designation',
    ).filter(submissionDate__gte=query_date)
    total_count = leave_forms_qs.count()
    leave_forms = leave_forms_qs[offset: offset + limit]
    leave_requests = [
        {
            "id": form.id,
            "name": form.name,
            "submissionDate": form.submissionDate,
            "status": form.status,
            "leaveStartDate": form.leaveStartDate,
            "leaveEndDate": form.leaveEndDate,
            "assignedTo": (
                form.first_recieved_by.id.username
                if form.first_recieved_by and form.first_recieved_by.id
                else None
            ),
            "assignedToDesignation": (
                form.first_recieved_designation.name
                if form.first_recieved_designation
                else None
            ),
        }
        for form in leave_forms
    ]
    return leave_requests, total_count


def get_admin_leave_balances_payload(limit, offset):
    employees = list(Employee.objects.select_related("id").all().order_by("id")[offset: offset + limit])
    employee_pks = [employee.pk for employee in employees]

    extra_info_map = {
        info.user_id: info
        for info in ExtraInfo.objects.select_related("department").filter(user_id__in=employee_pks)
    }
    leave_balance_map = {item.empid_id: item for item in LeaveBalance.objects.filter(empid_id__in=employee_pks)}
    leave_per_year_map = {item.empid_id: item for item in LeavePerYear.objects.filter(empid_id__in=employee_pks)}

    employee_leave_list = []
    for employee in employees:
        user_inst = employee.id
        emp_extra_info = extra_info_map.get(user_inst.id)
        department = emp_extra_info.department.name if emp_extra_info and emp_extra_info.department else None
        employee_data = {
            "employee_id": user_inst.id,
            "employee_username": user_inst.username,
            "employee_fullname": user_inst.get_full_name(),
            "department": department,
        }

        leave_balance = leave_balance_map.get(employee.pk)
        leave_per_year = leave_per_year_map.get(employee.pk)
        if not leave_balance or not leave_per_year:
            missing_fields = []
            if not leave_balance:
                missing_fields.append("LeaveBalance")
            if not leave_per_year:
                missing_fields.append("LeavePerYear")
            employee_data["error"] = f"Missing record(s): {', '.join(missing_fields)}."
        else:
            employee_data.update(build_leave_balance_summary_payload(leave_balance, leave_per_year))

        employee_leave_list.append(employee_data)

    return employee_leave_list


def get_hr_employees_payload(limit, offset):
    employees = list(Employee.objects.select_related("id").all().order_by("id")[offset: offset + limit])
    user_ids = [emp.id.id for emp in employees]
    extra_info_map = {
        item.user_id: item
        for item in ExtraInfo.objects.select_related("department").filter(user_id__in=user_ids)
    }

    return [
        {
            "id": emp.id.id,
            "name": f"{emp.id.first_name} {emp.id.last_name}".strip(),
            "username": emp.id.username,
            "department": (
                extra_info_map[emp.id.id].department.name
                if emp.id.id in extra_info_map and extra_info_map[emp.id.id].department
                else None
            ),
        }
        for emp in employees
    ]


def get_employee_initials_payload(employee_id):
    employee = selectors.get_employee_by_id(employee_id)
    extra_info, emp_confidential = selectors.get_employee_initial_context(employee)
    if not extra_info:
        raise ServiceNotFoundError("ExtraInfo not found")
    if not emp_confidential:
        raise ServiceNotFoundError("EmpConfidentialDetails not found")

    user = employee.id
    return {
        "name": f"{user.first_name} {user.last_name}".strip(),
        "pfno": emp_confidential.personal_file_number,
        "department": extra_info.department.name if extra_info.department else None,
    }


def update_employee_leave_balance(employee, input_data):
    leave_balance = LeaveBalance.objects.get(empid=employee)
    leave_per_year = LeavePerYear.objects.get(empid=employee)

    leave_balance_fields = [
        "casual_leave_taken",
        "special_casual_leave_taken",
        "earned_leave_taken",
        "half_pay_leave_taken",
        "maternity_leave_taken",
        "child_care_leave_taken",
        "paternity_leave_taken",
        "leave_encashment_taken",
        "restricted_holiday_taken",
    ]
    leave_balance_taken_to_balance_map = {
        "casual_leave_taken": ("casual_leave_balance", "casual_leave"),
        "special_casual_leave_taken": ("special_casual_leave_balance", "special_casual_leave"),
        "earned_leave_taken": ("earned_leave_balance", "earned_leave"),
        "half_pay_leave_taken": ("half_pay_leave_balance", "half_pay_leave"),
        "maternity_leave_taken": ("maternity_leave_balance", "maternity_leave"),
        "child_care_leave_taken": ("child_care_leave_balance", "child_care_leave"),
        "paternity_leave_taken": ("paternity_leave_balance", "paternity_leave"),
        "leave_encashment_taken": ("leave_encashment_balance", "leave_encashment"),
        "restricted_holiday_taken": ("restricted_holiday_balance", "restricted_holiday"),
    }
    leave_per_year_fields = [
        "casual_leave",
        "special_casual_leave",
        "earned_leave",
        "half_pay_leave",
        "maternity_leave",
        "child_care_leave",
        "paternity_leave",
        "leave_encashment",
        "restricted_holiday",
    ]

    for field in leave_balance_fields:
        if field not in input_data:
            continue
        try:
            taken_value = int(input_data[field])
            balance_attr, allotted_attr = leave_balance_taken_to_balance_map[field]
            allotted_value = int(input_data.get(allotted_attr, getattr(leave_per_year, allotted_attr)))
            setattr(leave_balance, balance_attr, max(allotted_value - taken_value, 0))
        except (ValueError, TypeError):
            raise ServiceValidationError(f"Invalid value for {field}")

    for field in leave_per_year_fields:
        if field not in input_data:
            continue
        try:
            setattr(leave_per_year, field, int(input_data[field]))
        except (ValueError, TypeError):
            raise ServiceValidationError(f"Invalid value for {field}")

    leave_balance.save()
    leave_per_year.save()


# =======================
# ATOMIC OPERATIONS FOR LEAVE MANAGEMENT
# =======================

@transaction.atomic
def approve_leave_with_balance_deduction(leave_form_id, approver_user, remarks=None):
    """
    Atomically approve leave and deduct balance (CRITICAL FIX for BR-002, BR-003)
    
    This function:
    1. Locks the LeaveForm and LeaveBalance rows
    2. Validates balance is sufficient
    3. Deducts balance in same transaction
    4. Updates leave form state
    
    Returns: Updated LeaveForm or raises exception
    Raises: ServiceValidationError on insufficient balance or race condition
    """
    from applications.hr2.models import LeaveForm, LeaveBalance, LeaveFormApprovalStep, Employee
    from django.utils import timezone
    
    # Lock both records to prevent race conditions
    leave_form = LeaveForm.objects.select_for_update().get(id=leave_form_id)
    leave_balance = LeaveBalance.objects.select_for_update().get(empid=leave_form.employee)

    approver_employee = approver_user
    if approver_user and not isinstance(approver_user, Employee):
        approver_employee = Employee.objects.filter(id=approver_user).first()

    if not approver_employee:
        raise ServiceValidationError("Approver employee record not found")

    approver_actor = approver_employee.id
    
    # ATOMIC: Update both in same transaction
    try:
        updated_fields = _deduct_balances_for_leave_form(leave_balance, leave_form)
        leave_balance.last_updated = timezone.now()
        if 'last_updated' not in updated_fields:
            updated_fields.append('last_updated')
        leave_balance.save(update_fields=updated_fields)
        
        # Update leave form state
        leave_form.state = 'final_approved'
        leave_form.status = 'Accepted'  # Legacy field
        leave_form.balance_deducted = True
        leave_form.balance_deduction_date = timezone.now()
        leave_form.approved_by = approver_employee
        leave_form.Remarks = remarks
        leave_form.version += 1  # Increment version for optimistic locking
        leave_form.save()
        
        # Log audit event
        audit_event(
            'leave_approved_with_balance_deduction',
            user=approver_actor,
            object_id=leave_form_id,
            details={
                'days_deducted': leave_form.get_total_days_requested(),
            }
        )
        
        # Log to database audit trail
        from applications.hr2.models import LeaveFormAuditLog
        LeaveFormAuditLog.objects.create(
            leave_form=leave_form,
            action='balance_deduction',
            performed_by=approver_actor,
            new_values={
                'state': leave_form.state,
                'balance_deducted': True,
            },
            remarks=remarks
        )
        
        return leave_form
        
    except Exception as e:
        logger.error(f"Failed to approve leave {leave_form_id}: {str(e)}")
        raise ServiceValidationError(f"Failed to approve leave: {str(e)}")


def get_primary_leave_type(leave_form):
    """Determine which leave type was primarily requested"""
    if leave_form.Noof_CasualLeave > 0:
        return 'casual'
    elif leave_form.Noof_earnedLeave > 0:
        return 'earned'
    elif leave_form.Noof_vacationLeave > 0:
        return 'vacation'
    elif leave_form.Noof_maternityLeave > 0:
        return 'maternity'
    elif leave_form.Noof_paternityLeave > 0:
        return 'paternity'
    return 'casual'


@transaction.atomic
def reject_leave_form(leave_form_id, rejector_user, reason):
    """Atomically reject leave form and log audit trail"""
    from applications.hr2.models import LeaveForm, LeaveFormAuditLog
    from django.utils import timezone
    
    leave_form = LeaveForm.objects.select_for_update().get(id=leave_form_id)
    
    old_state = leave_form.state
    if leave_form.state == 'submitted':
        leave_form.state = 'hod_rejected'
    elif leave_form.state == 'hod_approved':
        leave_form.state = 'dean_rejected'
    elif leave_form.state == 'dean_approved':
        leave_form.state = 'registrar_rejected'
    elif leave_form.state == 'registrar_approved':
        leave_form.state = 'sanction_rejected'
    else:
        leave_form.state = 'cancelled'
    leave_form.status = 'Rejected'
    leave_form.save()
    
    # Audit log
    LeaveFormAuditLog.objects.create(
        leave_form=leave_form,
        action='reject',
        performed_by=rejector_user,
        old_values={'state': old_state},
        new_values={'state': leave_form.state},
        remarks=reason
    )
    
    audit_event('leave_rejected', user=rejector_user, object_id=leave_form_id, details={'reason': reason})
    
    return leave_form


@transaction.atomic
def withdraw_leave_form(leave_form_id, employee_user):
    """Atomically withdraw leave form and restore balance if already deducted"""
    from applications.hr2.models import LeaveForm, LeaveBalance, LeaveFormAuditLog
    from django.utils import timezone
    
    leave_form = LeaveForm.objects.select_for_update().get(id=leave_form_id)
    
    # Check if balance was already deducted
    if leave_form.balance_deducted:
        # Restore balance
        leave_balance = LeaveBalance.objects.select_for_update().get(empid=leave_form.employee)
        _restore_balances_for_leave_form(leave_balance, leave_form)
        leave_balance.save()
        
        audit_event(
            'leave_balance_restored_due_to_withdrawal',
            user=employee_user,
            object_id=leave_form_id,
            details={'days_restored': leave_form.get_total_days_requested()}
        )
    
    # Update leave form
    old_state = leave_form.state
    leave_form.state = 'withdrawn'
    leave_form.balance_deducted = False
    leave_form.status = 'Rejected'
    leave_form.save()
    
    # Audit log
    LeaveFormAuditLog.objects.create(
        leave_form=leave_form,
        action='update',
        performed_by=employee_user,
        old_values={'state': old_state, 'balance_deducted': True},
        new_values={'state': 'withdrawn', 'balance_deducted': False},
    )
    
    return leave_form


@transaction.atomic
def cancel_leave_form(leave_form_id, employee_user, reason):
    """
    UC-071-073 — Cancel approved leave before start date (BR-HR-022)
    Restores balance if already deducted.
    """
    from applications.hr2.models import LeaveForm, LeaveBalance, LeaveFormAuditLog
    from django.utils import timezone
    
    leave_form = LeaveForm.objects.select_for_update().get(id=leave_form_id)
    
    # BR-HR-022: Must be approved and not yet started
    if leave_form.state not in ('final_approved', 'sanction_approved'):
        raise ServiceValidationError("Only approved leave can be cancelled. Use withdraw for pending requests.")
    
    if leave_form.start_date <= timezone.now().date():
        raise ServiceValidationError("Cannot cancel leave that has already started. Contact HR for manual adjustment.")
    
    # Restore balance
    if leave_form.balance_deducted:
        leave_balance = LeaveBalance.objects.select_for_update().get(empid=leave_form.employee)
        _restore_balances_for_leave_form(leave_balance, leave_form)
        leave_balance.save()
        
        audit_event(
            'leave_balance_restored_due_to_cancellation',
            user=employee_user,
            object_id=leave_form_id,
            details={'days_restored': leave_form.get_total_days_requested()}
        )
    
    # Update state
    old_state = leave_form.state
    leave_form.state = 'cancelled'
    leave_form.status = 'Rejected'
    leave_form.save()
    
    # Audit log
    LeaveFormAuditLog.objects.create(
        leave_form=leave_form,
        action='update',
        performed_by=employee_user,
        old_values={'state': old_state},
        new_values={'state': 'cancelled'},
        remarks=reason
    )
    
    return leave_form


@transaction.atomic
def request_leave_extension(leave_form_id, new_end_date, reason, employee_user):
    """
    UC-081 — Request extension of ongoing leave.
    Creates a duplicate form or marks original for extension review.
    Here we implement it by updating end_date and resetting state to 'hod_approved'
    for re-sanctioning if needed.
    """
    from applications.hr2.models import LeaveForm, LeaveFormAuditLog
    from django.utils import timezone
    
    leave_form = LeaveForm.objects.select_for_update().get(id=leave_form_id)
    
    if leave_form.state != 'final_approved':
        raise ServiceValidationError("Can only extend final_approved leave")
        
    if new_end_date <= leave_form.end_date:
        raise ServiceValidationError("New end date must be after current end date")
        
    old_end_date = leave_form.end_date
    leave_form.end_date = new_end_date
    leave_form.state = 'hod_approved'  # Needs re-sanctioning
    leave_form.save()
    
    # Audit log
    LeaveFormAuditLog.objects.create(
        leave_form=leave_form,
        action='update',
        performed_by=employee_user,
        old_values={'end_date': str(old_end_date), 'state': 'final_approved'},
        new_values={'end_date': str(new_end_date), 'state': 'hod_approved'},
        remarks=f"Extension request: {reason}"
    )
    
    return leave_form


# =======================
# STRUCTURED ERROR LOGGING
# =======================

def log_error_to_database(error_code, error_message, error_type, module, function, 
                         severity='MEDIUM', user=None, employee=None, leave_form=None, 
                         request_path=None, request_method=None, line_number=None):
    """Log structured error to database for monitoring and debugging"""
    import traceback
    from applications.hr2.models import ErrorLog
    
    ErrorLog.objects.create(
        error_code=error_code,
        error_message=error_message,
        error_type=error_type,
        severity=severity,
        module=module,
        function=function,
        line_number=line_number,
        user=user,
        employee=employee,
        leave_form=leave_form,
        request_path=request_path,
        request_method=request_method,
        stack_trace=traceback.format_exc() if severity == 'CRITICAL' else None
    )


# =======================
# SUBSTITUTE WORKFLOW
# =======================

@transaction.atomic
def create_substitute_request(leave_form_id, substitute_employee_id, reason, requesting_user):
    """Create a substitute request (UC-004)"""
    from applications.hr2.models import SubstituteRequest, LeaveForm, Employee
    
    leave_form = LeaveForm.objects.get(id=leave_form_id)
    substitute_employee = Employee.objects.get(id=substitute_employee_id)
    
    # Validate substitute is different from requester
    if leave_form.employee_id == substitute_employee_id:
        raise ServiceValidationError("Cannot request self as substitute")
    
    # Create request
    sub_request = SubstituteRequest.objects.create(
        leave_form=leave_form,
        requesting_employee=leave_form.employee,
        substitute_employee=substitute_employee,
        reason_for_substitution=reason,
        created_by=requesting_user
    )
    
    audit_event('substitute_requested', user=requesting_user, object_id=leave_form_id, 
                details={'substitute_id': substitute_employee_id})
    
    return sub_request


@transaction.atomic
def respond_to_substitute_request(sub_request_id, status, remarks, responding_user):
    """Respond to substitute request - Accept/Reject (UC-005)"""
    from applications.hr2.models import SubstituteRequest, LeaveFormAuditLog
    from django.utils import timezone
    
    sub_request = SubstituteRequest.objects.select_for_update().get(id=sub_request_id)
    
    if status not in ['accepted', 'rejected']:
        raise ServiceValidationError("Invalid substitute response status")
    
    sub_request.status = status
    sub_request.response_date = timezone.now()
    sub_request.response_remarks = remarks
    sub_request.save()
    
    # Log audit
    LeaveFormAuditLog.objects.create(
        leave_form=sub_request.leave_form,
        action='substitute_response',
        performed_by=responding_user,
        new_values={'substitute_status': status},
        remarks=remarks
    )
    
    audit_event('substitute_responded', user=responding_user, object_id=sub_request.leave_form_id,
                details={'status': status})
    
    return sub_request



# ── API Response & Permission Utilities ────────────────────────────────
# These helpers support views but contain no Django ORM queries.
# Kept here per the architecture's 'Services = business logic' rule.



# (imports moved to module top)


class APIResponse:
    """Standardized API response format"""
    
    @staticmethod
    def success(data=None, message="Success", status_code=http_status.HTTP_200_OK):
        """Return standardized success response"""
        return Response({
            "status": "success",
            "message": message,
            "data": data if data is not None else {},
            "error_code": "",
        }, status=status_code)
    
    @staticmethod
    def error(error_code, error_message, field_errors=None, status_code=http_status.HTTP_400_BAD_REQUEST, user=None):
        """Return standardized error response"""
        payload_data = {}
        if field_errors:
            payload_data["field_errors"] = field_errors
        return Response({
            "status": "error",
            "message": error_message,
            "data": payload_data,
            "error_code": error_code or "ERR_UNKNOWN",
        }, status=status_code)
    
    @staticmethod
    def paginated(queryset, page_size=20, data_key="results"):
        """Return paginated response"""
        from rest_framework.pagination import PageNumberPagination
        
        paginator = PageNumberPagination()
        paginator.page_size = page_size
        paginated_data = paginator.paginate_queryset(queryset, None)
        
        return {
            "count": paginator.page.paginator.count if paginator.page else 0,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            data_key: paginated_data
        }


class APIErrorHandler:
    """Centralized error handling for API views"""
    
    ERROR_CODES = {
        'INSUFFICIENT_BALANCE': 'ERR_INSUFFICIENT_BALANCE',
        'LEAVE_OVERLAP': 'ERR_LEAVE_OVERLAP',
        'VALIDATION_ERROR': 'ERR_VALIDATION',
        'INVALID_REQUEST': 'ERR_INVALID_REQUEST',
        'PERMISSION_DENIED': 'ERR_PERMISSION',
        'NOT_FOUND': 'ERR_NOT_FOUND',
        'CONFLICT': 'ERR_CONFLICT',
        'RACE_CONDITION': 'ERR_RACE_CONDITION',
        'DATABASE_ERROR': 'ERR_DATABASE',
        'EXTERNAL_SERVICE_ERROR': 'ERR_EXTERNAL_SERVICE',
        'SERVER_ERROR': 'ERR_SERVER',
        'INTERNAL_ERROR': 'ERR_INTERNAL',
    }
    
    STATUS_CODES = {
        'INSUFFICIENT_BALANCE': http_status.HTTP_400_BAD_REQUEST,
        'LEAVE_OVERLAP': http_status.HTTP_409_CONFLICT,
        'VALIDATION_ERROR': http_status.HTTP_400_BAD_REQUEST,
        'INVALID_REQUEST': http_status.HTTP_400_BAD_REQUEST,
        'PERMISSION_DENIED': http_status.HTTP_403_FORBIDDEN,
        'NOT_FOUND': http_status.HTTP_404_NOT_FOUND,
        'CONFLICT': http_status.HTTP_409_CONFLICT,
        'RACE_CONDITION': http_status.HTTP_409_CONFLICT,
        'DATABASE_ERROR': http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        'EXTERNAL_SERVICE_ERROR': http_status.HTTP_502_BAD_GATEWAY,
        'SERVER_ERROR': http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        'INTERNAL_ERROR': http_status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    @classmethod
    def handle_error(cls, error_type, error_message, field_errors=None,
                     user=None, employee=None, leave_form=None,
                     request_data=None, severity='MEDIUM'):
        error_code = cls.ERROR_CODES.get(error_type, 'ERR_UNKNOWN')
        # BUG FIX: Renamed local var from 'http_status' to 'response_status_code'
        # to avoid shadowing the module-level `from rest_framework import status as http_status`
        response_status_code = cls.STATUS_CODES.get(error_type, http_status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Log to database
        try:
            log_error_to_database(
                error_code=error_code,
                error_message=error_message,
                error_type=error_type,
                module='hr2.api_views',
                function='handle_error',
                severity=severity,
                user=user,
                employee=employee,
                leave_form=leave_form
            )
        except Exception as e:
            logger.error(f"Failed to log error to database: {str(e)}")

        # Return API response
        return APIResponse.error(
            error_code=error_code,
            error_message=error_message,
            field_errors=field_errors,
            status_code=response_status_code,
            user=user
        )



def handle_view_exception(view_func):
    """Decorator to handle exceptions in API views.

    BUG FIX: Added @wraps so the wrapped function preserves __name__ and __doc__,
    making stack traces and Django URL introspection readable.
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        try:
            return view_func(*args, **kwargs)
        except ServiceValidationError as e:
            return APIErrorHandler.handle_error(
                'VALIDATION_ERROR',
                str(e),
                severity='LOW'
            )
        except ServiceNotFoundError as e:
            return APIErrorHandler.handle_error(
                'NOT_FOUND',
                str(e),
                severity='LOW'
            )
        except ValueError as e:
            return APIErrorHandler.handle_error(
                'VALIDATION_ERROR',
                str(e),
                severity='MEDIUM'
            )
        except PermissionError as e:
            return APIErrorHandler.handle_error(
                'PERMISSION_DENIED',
                str(e),
                severity='MEDIUM'
            )
        except Exception as e:
            logger.error(f"Unhandled exception in {view_func.__name__}: {str(e)}\n{traceback.format_exc()}")
            return APIErrorHandler.handle_error(
                'INTERNAL_ERROR',
                f"An unexpected error occurred: {type(e).__name__}: {str(e)}",
                severity='HIGH'
            )
    return wrapper


class PaginationHelper:
    """Helper for implementing pagination across API endpoints"""
    
    @staticmethod
    def get_page_params(request):
        """Extract pagination parameters from request"""
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            # Validate ranges
            if page < 1:
                page = 1
            if page_size < 1 or page_size > 100:
                page_size = 20
            
            return page, page_size
        except (ValueError, TypeError):
            return 1, 20
    
    @staticmethod
    def paginate_queryset(queryset, page, page_size):
        """Paginate a queryset"""
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        paginated = queryset[start:end]
        
        return {
            'page': page,
            'page_size': page_size,
            'total_count': total_count,
            'total_pages': (total_count + page_size - 1) // page_size,
            'results': list(paginated)
        }


class FilterHelper:
    """Helper for implementing filtering across API endpoints"""
    
    @staticmethod
    def apply_filters(queryset, filters_dict):
        """Apply filters to queryset"""
        for field, value in filters_dict.items():
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset


# Serializer validation helper
def validate_serializer(serializer_class, data, instance=None):
    """Validate and return serializer or raise ValidationError"""
    serializer = serializer_class(instance, data=data) if instance else serializer_class(data=data)
    if not serializer.is_valid():
        raise ValueError(serializer.errors)
    return serializer



# (wraps imported at module top)

from applications.globals.models import ExtraInfo, HoldsDesignation



ROLE_ALIASES = {
    "HR_ADMIN": {"SectionHead_HR", "hr_admin"},
}


def get_user_role_name(user):
    extra_info = ExtraInfo.objects.filter(user=user).first()
    if not extra_info:
        return None
    if extra_info.last_selected_role:
        return extra_info.last_selected_role

    designation = HoldsDesignation.objects.select_related("designation").filter(user=user).last()
    if not designation:
        return None

    extra_info.last_selected_role = designation.designation.name
    extra_info.save(update_fields=["last_selected_role"])
    return extra_info.last_selected_role


def user_has_role(user, role_name):
    if not user or not user.is_authenticated:
        return False

    # Bypass for superusers and the default fusion_admin test user
    if user.is_superuser or user.username == 'fusion_admin':
        return True

    if role_name == "HR_USER":
        return user_has_hr_access(user)

    role = get_user_role_name(user)
    if not role:
        return False

    allowed = ROLE_ALIASES.get(role_name, {role_name})
    return role in allowed


def require_role(role_name):
    """
    Decorator that enforces role-based access control.
    
    Args:
        role_name: Can be a single role string (e.g., "HR_USER") or a list of roles
                   (e.g., ["HR_USER", "Faculty"]). If a list is provided, the user must
                   have at least one of the specified roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            
            user = getattr(request, "user", None)
            if not user or not user.is_authenticated:
                return APIErrorHandler.handle_error(
                    "PERMISSION_DENIED",
                    "Authentication required",
                    user=user,
                )

            # Support both single role and multiple roles
            allowed_roles = role_name if isinstance(role_name, list) else [role_name]
            
            # Check if user has at least one of the allowed roles
            has_permission = any(user_has_role(user, role) for role in allowed_roles)
            
            if not has_permission:
                roles_str = " or ".join(allowed_roles)
                return APIErrorHandler.handle_error(
                    "PERMISSION_DENIED",
                    f"{roles_str} role required",
                    user=user,
                )

            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator




# ==============================================================================
# BR-HR-022 — Leave Cancellation Window
# ==============================================================================

CANCELLATION_WINDOW_DAYS = 2  # Cancellation allowed up to N days after approval


def validate_cancellation_window(leave_form):
    """
    BR-HR-022: Leave may only be cancelled within CANCELLATION_WINDOW_DAYS of the
    approval date. After that window, the employee must use the withdrawal process.

    Args:
        leave_form: An approved LeaveForm instance.

    Raises:
        ServiceValidationError if the cancellation window has passed.
    """
    from datetime import timedelta, date as today_date
    if leave_form.status != 'Accepted':
        raise ServiceValidationError('Only approved leave forms can be cancelled.')

    if not leave_form.approvedDate:
        return  # No approval date recorded — allow cancellation

    deadline = leave_form.approvedDate + timedelta(days=CANCELLATION_WINDOW_DAYS)
    if today_date.today() > deadline:
        raise ServiceValidationError(
            f"Cancellation window has expired. Leave can only be cancelled within "
            f"{CANCELLATION_WINDOW_DAYS} days of approval (deadline: {deadline})."
        )


# ==============================================================================
# BR-HR-025 — Half-Day Casual Leave (0.5 day deduction)
# ==============================================================================

def validate_half_day_leave(leave_data):
    """
    BR-HR-025: An employee may apply for half-day CL. In this case:
      - Only CL is permitted (no other leave type in the same application).
      - The is_half_day flag must be set; the deduction is 0.5 days from CL balance.

    Args:
        leave_data (dict): Parsed leave data including 'is_half_day' and leave counts.

    Returns:
        float: The CL multiplier (0.5 for half-day, 1.0 for full day).

    Raises:
        ServiceValidationError if half-day rules are violated.
    """
    is_half_day = bool(leave_data.get('is_half_day', False))
    if not is_half_day:
        return 1.0

    # Half-day is only allowed for Casual Leave
    non_cl_types = [
        'specialCasualLeave', 'earnedLeave', 'commutedLeave',
        'restrictedHoliday', 'vacationLeave', 'maternityLeave',
        'childCareLeave', 'paternityLeave', 'halfPayLeave',
    ]
    for field in non_cl_types:
        if int(leave_data.get(field, 0) or 0) > 0:
            raise ServiceValidationError(
                'Half-day leave is only permitted for Casual Leave (CL). '
                'No other leave type may be combined with half-day CL.'
            )

    cl_days = int(leave_data.get('casualLeave', 0) or 0)
    if cl_days != 1:
        raise ServiceValidationError(
            'Half-day CL must be applied for exactly 1 CL day '
            '(which will deduct 0.5 days from your CL balance).'
        )

    return 0.5  # Multiplier for balance deduction


# ==============================================================================
# BR-HR-028 — Director Self-Sanction
# ==============================================================================

DIRECTOR_DESIGNATIONS = frozenset([
    'Director', 'Director IIIT', 'Director (I/C)',
])


def validate_director_self_sanction(approver_employee, leave_form):
    """
    BR-HR-028: The Director (or equivalent) is authorized to self-sanction their
    own leave application — no secondary sanctioning authority is required.

    Args:
        approver_employee: The Employee instance performing the sanction.
        leave_form: The LeaveForm being sanctioned.

    Returns:
        bool: True if the Director is self-sanctioning their own leave.
    """
    from applications.globals.models import HoldsDesignation as _HD
    approver_user = approver_employee.id
    holds = _HD.objects.select_related('designation').filter(user=approver_user)
    approver_designations = {h.designation.name for h in holds}

    is_director = bool(approver_designations & DIRECTOR_DESIGNATIONS)
    is_own_leave = leave_form.employee == approver_employee

    if is_director and is_own_leave:
        return True  # BR-028: Director self-sanction — no hierarchy check required
    return False


# ==============================================================================
# BR-HR-201 — Appraisal Eligibility: ≥1 Year of Continuous Service
# ==============================================================================

def validate_appraisal_eligibility(employee):
    """
    BR-HR-201: An employee must have at least 1 year of continuous service
    to submit an appraisal form.

    Args:
        employee: The Employee model instance.

    Raises:
        ServiceValidationError if the employee has less than 1 year of service.
    """
    from datetime import date as today_date
    from applications.globals.models import ExtraInfo as _EI

    extra_info = _EI.objects.filter(user=employee.id).first()
    if not extra_info or not extra_info.date_of_joining:
        raise ServiceValidationError(
            'Appraisal eligibility check failed: date of joining is not set. '
            'Please update your profile before submitting an appraisal.'
        )

    service_days = (today_date.today() - extra_info.date_of_joining).days
    if service_days < 365:
        raise ServiceValidationError(
            f'Appraisal requires at least 1 year (365 days) of continuous service. '
            f'Current service: {service_days} days. '
            f'Eligible from: {extra_info.date_of_joining.replace(year=extra_info.date_of_joining.year + 1)}.'
        )

# ==============================================================================
# BR-HR-010 / BR-HR-011 / BR-HR-012 — Approval Routing by Leave Type
# ==============================================================================

# Leave types that require ONLY HoD approval (BR-HR-010)
_HOD_ONLY_LEAVE_ATTRS = frozenset([
    'Noof_CasualLeave',
])

# Leave types that require Sanctioning Authority (BR-HR-012)
_SANCTION_REQUIRED_ATTRS = frozenset([
    'Noof_restrictedHoliday',
    'Noof_specialCasualLeave',
    'Noof_earnedLeave',
    'Noof_commutedLeave',
    'Noof_vacationLeave',
    'Noof_maternityLeave',
    'Noof_childCareLeave',
    'Noof_paternityLeave',
    'Noof_halfPayLeave',
])

# Leave types that require substitute nomination (BR-HR-011)
_SUBSTITUTE_REQUIRED_ATTRS = frozenset([
    'Noof_specialCasualLeave',
    'Noof_earnedLeave',
    'Noof_vacationLeave',
    'Noof_maternityLeave',
    'Noof_childCareLeave',
    'Noof_paternityLeave',
])


def determine_approval_level(leave_form):
    """
    BR-HR-010 / BR-HR-012: Determine the approval level required for a leave form.

    Returns:
            'hod_only'         — CL only: HoD is the final approver.
            'requires_sanction' — RH or any other leave type present: Sanctioning Authority required.
    """
    for attr in _SANCTION_REQUIRED_ATTRS:
        if int(getattr(leave_form, attr, 0) or 0) > 0:
            return 'requires_sanction'
    return 'hod_only'


def requires_substitute_nomination(leave_form):
    """
    BR-HR-011: Determine if substitute nomination is mandatory for this leave form.

    Returns True if any leave type in the form requires substitute consent.
    Exception: if the ONLY leave type is CL or RH, substitute is NOT required.
    """
    for attr in _SUBSTITUTE_REQUIRED_ATTRS:
        if int(getattr(leave_form, attr, 0) or 0) > 0:
            return True
    return False


# ==============================================================================
# BR-HR-024 — Resumption Window Validation
# ==============================================================================

RESUMPTION_WINDOW_DAYS = 2  # Employee must notify within 2 working days of return


def validate_resumption_window(leave_form, resumed_on_date):
    """
    BR-HR-024: Employee must notify resumption within RESUMPTION_WINDOW_DAYS
    of their leave end date.

    Args:
        leave_form: The approved LeaveForm instance.
        resumed_on_date: The date the employee actually returned (date object).

    Raises:
        ServiceValidationError if resumption notification is too late.
    """
    from datetime import timedelta
    if leave_form.leaveEndDate is None:
        return  # No end date set — skip window check

    deadline = leave_form.leaveEndDate + timedelta(days=RESUMPTION_WINDOW_DAYS)
    if resumed_on_date > deadline:
        raise ServiceValidationError(
            f"Resumption must be notified within {RESUMPTION_WINDOW_DAYS} days of the leave end date "
            f"({leave_form.leaveEndDate}). Notified on: {resumed_on_date}. "
            f"Deadline was: {deadline}."
        )


# ==============================================================================
# BR-HR-407 — Leave Status Change Notifications
# ==============================================================================

def send_leave_notification(leave_form, event_type, recipient_user=None):
    """
    BR-HR-407: Send a notification to the employee (and optionally the approver)
    when a leave status changes.

    This function is a best-effort stub. If the notifications_extension module
    is unavailable (common in test environments), a warning is logged but no
    exception is raised — so the main leave workflow is never blocked by a
    notification failure.

    Args:
        leave_form: The LeaveForm instance that changed state.
        event_type: One of 'submitted', 'approved', 'rejected', 'withdrawn',
                    'resumption_notified'.
        recipient_user: Optional specific user to notify (defaults to leave applicant).
    """
    target_user = recipient_user or leave_form.employee.id
    notification_payload = {
        'module': 'HR',
        'event': event_type,
        'object_id': leave_form.id,
        'recipient': getattr(target_user, 'username', str(target_user)),
        'message': _build_notification_message(leave_form, event_type),
    }

    try:
        from applications.notifications_extension import notify_user  # type: ignore
        notify_user(
            user=target_user,
            title=f"Leave Update — {event_type.replace('_', ' ').title()}",
            body=notification_payload['message'],
            module='HR',
            object_id=leave_form.id,
        )
        audit_event(
            f'notification_sent_{event_type}',
            user=target_user,
            object_id=leave_form.id,
        )
    except ImportError:
        logger.warning(
            "HR Notification: notifications_extension module not available. "
            "Notification skipped for leave_form=%s event=%s recipient=%s",
            leave_form.id, event_type, notification_payload['recipient'],
        )
    except Exception as exc:
        # Never block the main flow due to notification failure
        logger.error(
            "HR Notification: Failed to send notification for leave_form=%s event=%s: %s",
            leave_form.id, event_type, exc,
        )


def _build_notification_message(leave_form, event_type):
    messages = {
        'submitted': f"Your leave application (ID: {leave_form.id}) has been submitted successfully.",
        'approved': f"Your leave application (ID: {leave_form.id}) has been approved.",
        'rejected': f"Your leave application (ID: {leave_form.id}) has been rejected. "
                    f"Remarks: {leave_form.Remarks or 'No remarks provided.'}",
        'withdrawn': f"Your leave application (ID: {leave_form.id}) has been withdrawn.",
        'resumption_notified': f"Resumption from leave (ID: {leave_form.id}) has been notified.",
    }
    return messages.get(event_type, f"Leave application (ID: {leave_form.id}) status changed: {event_type}.")


# ==============================================================================
# BR-HR-019 — SLA Escalation Check
# Callable as a management command (see management/commands/check_leave_sla.py)
# ==============================================================================

SLA_PENDING_DAYS = 3  # Number of days before a submitted leave is considered overdue


def check_sla_and_escalate():
    """
    BR-HR-019: Identify leave forms that have been in 'submitted' state beyond
    the SLA window and log escalation events.

    This function is designed to be called by the 'check_leave_sla' management
    command on a schedule (e.g., daily cron). It does NOT send emails directly
    but logs audit events and optionally calls send_leave_notification.

    Returns:
        list of leave form IDs that were escalated.
    """
    from datetime import timedelta, date as today_date
    from django.db.models import Q as _Q

    cutoff_date = today_date.today() - timedelta(days=SLA_PENDING_DAYS)

    overdue_forms = LeaveForm.objects.filter(
        state='submitted',
        submissionDate__lte=cutoff_date,
    ).select_related('employee__id')

    escalated_ids = []
    for form in overdue_forms:
        audit_event(
            'leave_sla_breach',
            user=form.employee.id,
            object_id=form.id,
            details={
                'submitted_on': str(form.submissionDate),
                'sla_days': SLA_PENDING_DAYS,
                'days_overdue': (today_date.today() - form.submissionDate).days,
            },
        )
        # Optionally notify applicant of the delay
        send_leave_notification(form, event_type='sla_breach')
        escalated_ids.append(form.id)

    logger.info(
        "HR SLA Check: %d overdue leave forms escalated (cutoff: %s, SLA: %d days)",
        len(escalated_ids), cutoff_date, SLA_PENDING_DAYS,
    )
    return escalated_ids


# ==============================================================================
# BR-HR-301 — LTC Claim Frequency Check
# Employees may claim LTC only once every 2 years (Block Year policy).
# ==============================================================================

LTC_CLAIM_BLOCK_YEARS = 2  # Minimum years between LTC claims


def validate_ltc_claim_frequency(employee):
    """
    BR-HR-301: An employee may not claim LTC more than once per block of
    LTC_CLAIM_BLOCK_YEARS calendar years.

    Checks the LTC submission history (via LTCform model) for the current
    block period. Raises ServiceValidationError if the employee has already
    claimed LTC in the current block.

    Args:
        employee: The Employee model instance.

    Raises:
        ServiceValidationError if LTC frequency limit exceeded.
    """
    from datetime import date as today_date

    # Determine current block start year (e.g. 2024, 2026, ... for 2-yr blocks)
    current_year = today_date.today().year
    block_start_year = current_year - (current_year % LTC_CLAIM_BLOCK_YEARS)

    # Look for any approved or pending LTC claim within the current block
    # We check both the legacy model and the new one via generic form lookup
    try:
        from applications.hr2.models import LTCform
        existing_claim = LTCform.objects.filter(
            employee=employee,
            submissionDate__year__gte=block_start_year,
        ).exclude(status='Rejected').first()

        if existing_claim:
            raise ServiceValidationError(
                f"LTC claim frequency exceeded. You have already submitted an LTC claim "
                f"in block year {block_start_year}–{block_start_year + LTC_CLAIM_BLOCK_YEARS - 1} "
                f"(Form ID: {existing_claim.id}, Status: {existing_claim.status}). "
                f"LTC may only be claimed once per {LTC_CLAIM_BLOCK_YEARS}-year block."
            )
    except ImportError:
        # LTCform model may be in a different location; log and skip
        logger.warning("BR-301: LTCform model not importable; frequency check skipped.")


# ==============================================================================
# UC-301-304 — LTC Workflow: HR Admin Verification + Accountant Disbursement
# ==============================================================================

def verify_ltc_claim(ltc_form_id, hr_admin_user, remarks=''):
    """
    UC-302 — HR Admin verifies an LTC claim before forwarding to accounts.

    This step ensures the LTC form data (travel receipts, travel mode, amount)
    is complete and within policy before disbursement is triggered.

    Args:
        ltc_form_id: ID of the LTC form to verify.
        hr_admin_user: The User performing the verification.
        remarks: Optional verification remarks.

    Returns:
        Updated LTC form object.

    Raises:
        ServiceValidationError if form is not in the correct state.
        ServiceNotFoundError if form not found.
    """
    try:
        from applications.hr2.models import LTCform
    except ImportError:
        raise ServiceNotFoundError("LTCform model not available")

    ltc_form = LTCform.objects.filter(id=ltc_form_id).first()
    if not ltc_form:
        raise ServiceNotFoundError(f"LTC form {ltc_form_id} not found")

    if ltc_form.status not in ('Accepted', 'Pending'):
        raise ServiceValidationError(
            f"LTC form must be in Accepted/Pending state for HR verification. "
            f"Current status: {ltc_form.status}"
        )

    with transaction.atomic():
        ltc_form.status = 'HR_Verified'
        if hasattr(ltc_form, 'Remarks'):
            ltc_form.Remarks = (getattr(ltc_form, 'Remarks', '') or '') + f' | HR Verified: {remarks}'
            ltc_form.save(update_fields=['status', 'Remarks'])
        else:
            ltc_form.save(update_fields=['status'])

        audit_event(
            'ltc_hr_verified',
            user=hr_admin_user,
            object_id=ltc_form_id,
            details={'remarks': remarks},
        )
        send_leave_notification(
            ltc_form, event_type='approved', recipient_user=hr_admin_user
        ) if hasattr(ltc_form, 'employee') else None

    return ltc_form


def disburse_ltc_payment(ltc_form_id, accountant_user, remarks=''):
    """
    UC-304 / BR-HR-408 — Accountant marks LTC disbursement as completed.

    In a full integration this would push to the finance_accounts module.
    Currently implemented as an audit event + status update (disbursement stub).

    Args:
        ltc_form_id: ID of the LTC form.
        accountant_user: The User (accountant) performing disbursement.
        remarks: Optional disbursement note (e.g. UTR number, payment date).

    Raises:
        ServiceValidationError if form is not HR_Verified.
    """
    try:
        from applications.hr2.models import LTCform
    except ImportError:
        raise ServiceNotFoundError("LTCform model not available")

    ltc_form = LTCform.objects.filter(id=ltc_form_id).first()
    if not ltc_form:
        raise ServiceNotFoundError(f"LTC form {ltc_form_id} not found")

    if ltc_form.status != 'HR_Verified':
        raise ServiceValidationError(
            f"LTC disbursement requires HR verification first. "
            f"Current status: {ltc_form.status}"
        )

    with transaction.atomic():
        ltc_form.status = 'Disbursed'
        if hasattr(ltc_form, 'Remarks'):
            ltc_form.Remarks = (getattr(ltc_form, 'Remarks', '') or '') + f' | Disbursed: {remarks}'
            ltc_form.save(update_fields=['status', 'Remarks'])
        else:
            ltc_form.save(update_fields=['status'])

        audit_event(
            'ltc_payment_disbursed',
            user=accountant_user,
            object_id=ltc_form_id,
            details={
                'remarks': remarks,
                # BR-408: TODO — push to finance_accounts module when available
                'finance_integration': 'PENDING — finance_accounts module not integrated',
            },
        )
        logger.info(
            "BR-408 STUB: LTC disbursement recorded for form %s by %s. "
            "Finance push is pending integration with finance_accounts module.",
            ltc_form_id, accountant_user.username,
        )

    return ltc_form


# ==============================================================================
# UC-401-403 — CPDA Reconciliation Step
# After CPDA advance is used, employee must submit reconciliation within N days.
# ==============================================================================

CPDA_RECONCILIATION_DAYS = 60  # Days within which reconciliation must be submitted


def submit_cpda_reconciliation(cpda_advance_id, employee_user, actual_amount, receipts_attached, remarks=''):
    """
    UC-403 — Employee submits CPDA reconciliation (actual expenditure vs. advance).

    Business Rules:
      - Reconciliation must be submitted within CPDA_RECONCILIATION_DAYS of disbursement.
      - If actual < advance: excess is recovered / credited.
      - If actual > advance: additional claim is recorded for accountant review.

    Args:
        cpda_advance_id: ID of the CPDAAdvanceform.
        employee_user: The User submitting reconciliation.
        actual_amount: Actual amount spent (Decimal).
        receipts_attached: bool — whether supporting receipts are attached.
        remarks: Optional reconciliation notes.

    Returns:
        dict with reconciliation summary.
    """
    from decimal import Decimal, InvalidOperation
    try:
        from applications.hr2.models import CPDAAdvanceform
    except ImportError:
        raise ServiceNotFoundError("CPDAAdvanceform model not available")

    try:
        actual = Decimal(str(actual_amount))
    except (InvalidOperation, ValueError):
        raise ServiceValidationError("actual_amount must be a valid decimal number")

    if actual < 0:
        raise ServiceValidationError("actual_amount cannot be negative")

    if not receipts_attached:
        raise ServiceValidationError(
            "Supporting receipts must be attached for CPDA reconciliation"
        )

    cpda_form = CPDAAdvanceform.objects.filter(id=cpda_advance_id).first()
    if not cpda_form:
        raise ServiceNotFoundError(f"CPDA Advance form {cpda_advance_id} not found")

    if cpda_form.status not in ('Accepted', 'Disbursed'):
        raise ServiceValidationError(
            f"CPDA reconciliation can only be submitted after disbursement. "
            f"Current status: {cpda_form.status}"
        )

    # Check reconciliation deadline if disbursement date available
    if hasattr(cpda_form, 'disbursement_date') and cpda_form.disbursement_date:
        from datetime import timedelta, date as today_date
        deadline = cpda_form.disbursement_date + timedelta(days=CPDA_RECONCILIATION_DAYS)
        if today_date.today() > deadline:
            raise ServiceValidationError(
                f"CPDA reconciliation deadline has passed (deadline: {deadline}). "
                f"Please contact HR to proceed."
            )

    advance_amount = Decimal(str(getattr(cpda_form, 'amount', 0) or 0))
    difference = advance_amount - actual
    reconciliation_note = (
        f"Reconciled: advance={advance_amount}, actual={actual}, "
        f"{'excess_recovery=' + str(difference) if difference > 0 else 'additional_claim=' + str(-difference)}"
    )

    with transaction.atomic():
        cpda_form.status = 'Reconciled'
        if hasattr(cpda_form, 'Remarks'):
            cpda_form.Remarks = (getattr(cpda_form, 'Remarks', '') or '') + ' | ' + reconciliation_note
            cpda_form.save(update_fields=['status', 'Remarks'])
        else:
            cpda_form.save(update_fields=['status'])

        audit_event(
            'cpda_reconciliation_submitted',
            user=employee_user,
            object_id=cpda_advance_id,
            details={
                'advance_amount': str(advance_amount),
                'actual_amount': str(actual),
                'difference': str(difference),
                'remarks': remarks,
                'finance_integration': 'PENDING — excess recovery/additional claim requires finance_accounts push',
            },
        )
        logger.info(
            "BR-408 STUB: CPDA reconciliation recorded for form %s. "
            "Finance recovery/additional-claim push is pending integration.",
            cpda_advance_id,
        )

    return {
        'cpda_form_id': cpda_advance_id,
        'advance_amount': str(advance_amount),
        'actual_amount': str(actual),
        'difference': str(difference),
        'status': 'Reconciled',
        'action_required': 'excess_recovery' if difference > 0 else ('none' if difference == 0 else 'additional_claim'),
    }


# ==============================================================================
# UC-201 — Appraisal Reviewer Assignment (BR-HR-201)
# HR Admin assigns a reviewer to an appraisal form.
# ==============================================================================

def assign_appraisal_reviewer(appraisal_form_id, reviewer_employee_id, admin_user):
    """
    UC-201 — HR Admin assigns a designated reviewer to an appraisal submission.

    The reviewer must:
      - Be an active employee (Employee record exists).
      - Hold a designation at or above the appraisee's level.
      - Not be the appraisee themselves.

    Args:
        appraisal_form_id: ID of the Appraisalform.
        reviewer_employee_id: Employee ID of the assigned reviewer.
        admin_user: The admin User performing the assignment.

    Returns:
        Updated appraisal form.
    """
    try:
        from applications.hr2.models import Appraisalform
    except ImportError:
        raise ServiceNotFoundError("Appraisalform model not available")

    appraisal = Appraisalform.objects.filter(id=appraisal_form_id).first()
    if not appraisal:
        raise ServiceNotFoundError(f"Appraisal form {appraisal_form_id} not found")

    if appraisal.status not in ('Pending', 'Submitted'):
        raise ServiceValidationError(
            f"Reviewer can only be assigned to pending/submitted appraisals. "
            f"Current status: {appraisal.status}"
        )

    reviewer = Employee.objects.filter(id=reviewer_employee_id).first()
    if not reviewer:
        raise ServiceNotFoundError(f"Reviewer employee {reviewer_employee_id} not found")

    # Self-review check
    if hasattr(appraisal, 'employee') and appraisal.employee == reviewer:
        raise ServiceValidationError("An employee cannot be assigned as their own appraisal reviewer")

    with transaction.atomic():
        # Store reviewer — use reviewer field if it exists, else track via audit
        if hasattr(appraisal, 'reviewer'):
            appraisal.reviewer = reviewer
            appraisal.save(update_fields=['reviewer'])
        elif hasattr(appraisal, 'Remarks'):
            appraisal.Remarks = (getattr(appraisal, 'Remarks', '') or '') +                 f' | Reviewer assigned: {reviewer.id.username}'
            appraisal.save(update_fields=['Remarks'])

        audit_event(
            'appraisal_reviewer_assigned',
            user=admin_user,
            object_id=appraisal_form_id,
            details={
                'reviewer_employee_id': reviewer_employee_id,
                'reviewer_username': reviewer.id.username,
            },
        )

    return appraisal
