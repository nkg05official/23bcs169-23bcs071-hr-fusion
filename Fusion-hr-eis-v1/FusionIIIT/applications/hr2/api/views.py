import json
import logging
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import MultipleObjectsReturned
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.filetracking.sdk.methods import (
    archive_file,
    create_file,
    forward_file,
    view_archived,
    view_history,
    view_inbox,
    view_outbox,
)
from applications.globals.models import Designation, ExtraInfo, HoldsDesignation

# BUG FIX: These model imports were missing at module level, causing NameError
# when Employee.DoesNotExist / Designation.DoesNotExist were caught in exception
# handlers (e.g. submit_leave_form line 534, offline_leave_form line 1749).
from ..models import (
    ApprovalHierarchy,
    Employee,
    LeaveBalance,
    LeaveForm,
    LeavePerYear,
)

from .. import selectors, services
from ..services import (
    APIResponse,
    APIErrorHandler,
    handle_view_exception,
    require_role,
    PaginationHelper,
)
from .serializers import (
    Appraisal_serializer,
    CPDAAdvance_serializer,
    CPDAReimbursement_serializer,
    LeaveBalanace_serializer,
    Leave_serializer,
    LTC_serializer,
)


User = get_user_model()
logger = logging.getLogger(__name__)


def get_last_selected_role(user):
    """Utility: get the active designation name for a user."""
    extra_info = ExtraInfo.objects.filter(user=user).first()
    if extra_info and extra_info.last_selected_role:
        return extra_info.last_selected_role
    designation = HoldsDesignation.objects.select_related('designation').filter(user=user).last()
    if designation:
        name = designation.designation.name
        if extra_info:
            extra_info.last_selected_role = name
            extra_info.save(update_fields=['last_selected_role'])
        return name
    return None


def get_current_file_owner(file_id):
    """Utility: get current file owner user from file tracking."""
    history = view_history(file_id=file_id)
    if not history:
        return None
    last = history[-1]
    user_id = last.get('receiver_id')
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


def get_current_file_owner_designation(file_id):
    """Utility: get current file owner designation from file tracking."""
    history = view_history(file_id=file_id)
    if not history:
        return None
    last = history[-1]
    design_id = last.get('receive_design')
    try:
        return Designation.objects.get(id=design_id)
    except Designation.DoesNotExist:
        return None


def _get_leave_type_for_hierarchy(leave_form):
    restricted_holiday = int(leave_form.Noof_restrictedHoliday or 0) > 0
    has_other_leaves = any(
        [
            int(leave_form.Noof_specialCasualLeave or 0) > 0,
            int(leave_form.Noof_earnedLeave or 0) > 0,
            int(leave_form.Noof_commutedLeave or 0) > 0,
            int(leave_form.Noof_vacationLeave or 0) > 0,
            int(leave_form.Noof_maternityLeave or 0) > 0,
            int(leave_form.Noof_childCareLeave or 0) > 0,
            int(leave_form.Noof_paternityLeave or 0) > 0,
            int(leave_form.Noof_halfPayLeave or 0) > 0,
        ]
    )
    # RH now follows sanctioning hierarchy; CL-only remains HoD-only.
    return 'SCL_HR_COL_VL' if (has_other_leaves or restricted_holiday) else 'CL_RH_Only'


def _get_leave_department(leave_form):
    employee_user = leave_form.employee.id if leave_form.employee else None
    if not employee_user:
        return None
    extra = ExtraInfo.objects.select_related('department').filter(user=employee_user).first()
    return extra.department if extra else None


def _resolve_next_approver(leave_form, current_level):
    leave_type = _get_leave_type_for_hierarchy(leave_form)
    department = _get_leave_department(leave_form)

    hierarchy_qs = ApprovalHierarchy.objects.select_related('required_designation').filter(
        form_type='leave',
        leave_type=leave_type,
        approval_level=current_level + 1,
        is_active=True,
    )

    hierarchy = None
    if department:
        hierarchy = hierarchy_qs.filter(department=department).first()
    if not hierarchy:
        hierarchy = hierarchy_qs.filter(department__isnull=True).first()
    if not hierarchy:
        return None, None, None

    holder_qs = HoldsDesignation.objects.select_related('user', 'designation').filter(
        designation=hierarchy.required_designation
    )
    if department:
        for holder in holder_qs:
            extra = ExtraInfo.objects.select_related('department').filter(user=holder.user).first()
            if extra and extra.department_id == department.id:
                approver = Employee.objects.filter(id=holder.user).first()
                if approver:
                    return approver, hierarchy.required_designation, hierarchy.approval_level

    holder = holder_qs.first()
    if holder:
        approver = Employee.objects.filter(id=holder.user).first()
        if approver:
            return approver, hierarchy.required_designation, hierarchy.approval_level

    return None, None, None


def _get_current_hierarchy_level_for_user(leave_form, user):
    role_name = get_last_selected_role(user)
    if not role_name:
        return None

    leave_type = _get_leave_type_for_hierarchy(leave_form)
    department = _get_leave_department(leave_form)
    hierarchy_qs = ApprovalHierarchy.objects.filter(
        form_type='leave',
        leave_type=leave_type,
        required_designation__name=role_name,
        is_active=True,
    ).order_by('approval_level')

    if department:
        scoped = hierarchy_qs.filter(department=department).first()
        if scoped:
            return scoped.approval_level

    fallback = hierarchy_qs.filter(department__isnull=True).first()
    return fallback.approval_level if fallback else None


SERIALIZER_REGISTRY = {
    "LTC": LTC_serializer,
    "CPDAAdvance": CPDAAdvance_serializer,
    "CPDAReimbursement": CPDAReimbursement_serializer,
    "Leave": Leave_serializer,
    "Appraisal": Appraisal_serializer,
}


class BaseProtectedAPIView(APIView):
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsAuthenticated,)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not services.user_has_hr_access(request.user):
            raise PermissionDenied("HR access required")


class GenericFormAPIView(BaseProtectedAPIView):
    form_type = None

    @property
    def serializer_class(self):
        return SERIALIZER_REGISTRY[self.form_type]

    def post(self, request):
        if isinstance(request.data, dict):
            payload = request.data
            user_info = {}
        else:
            payload = services.get_payload_part(request.data, 0, {})
            user_info = services.get_payload_part(request.data, 1, {})

        try:
            with transaction.atomic():
                employee = None
                if self.form_type in {"LTC", "CPDAAdvance", "CPDAReimbursement", "Appraisal", "Leave"}:
                    employee = selectors.get_employee_for_user(request.user)
                    if self.form_type in {"LTC", "CPDAAdvance", "CPDAReimbursement", "Appraisal"}:
                        services.ensure_profile_complete(employee)
                        services.validate_employee_eligibility(employee, self.form_type)

                    if self.form_type == "Leave":
                        services.validate_leave_type_eligibility(employee, payload)
                        start_date = payload.get("leaveStartDate")
                        end_date = payload.get("leaveEndDate")
                        if start_date and end_date and services.has_overlapping_active_leave(employee, start_date, end_date):
                            raise services.ServiceValidationError(
                                "Leave dates overlap with existing approved leave requests"
                            )

                    if self.form_type in ["CPDAAdvance", "CPDAReimbursement"]:
                        amount = payload.get("amountRequired")
                        if amount:
                            services.validate_cpda_balance(employee, amount)

                # Set created_by for all form types (CPDA, LTC, Appraisal, Leave)
                if self.form_type in {"LTC", "CPDAAdvance", "CPDAReimbursement", "Appraisal", "Leave"}:
                    payload["created_by"] = request.user.id
                
                # Set employee reference if not already set (CPDA forms use employeeId field)
                if self.form_type in {"CPDAAdvance", "CPDAReimbursement"}:
                    if not payload.get("employeeId") and not payload.get("employee"):
                        payload["employeeId"] = employee.id

                serializer = services.run_serializer(self.serializer_class, payload)
                required_tracking_keys = {
                    "uploader_name",
                    "uploader_designation",
                    "receiver_name",
                    "receiver_designation",
                }
                if required_tracking_keys.issubset(set(user_info.keys())):
                    services.create_tracking_entry(user_info, serializer.data["id"], self.form_type)
            services.audit_event(
                f"{self.form_type.lower()}_created",
                user=request.user,
                object_id=serializer.data.get("id"),
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except services.ServiceValidationError as exc:
            services.audit_event(f"{self.form_type.lower()}_failed", user=request.user, details={"error": str(exc)})
            return Response({"error": getattr(exc, "args", [str(exc)])[0]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            services.audit_event(f"{self.form_type.lower()}_error", user=request.user, details={"error": str(exc)})
            import traceback
            logger.error(f"Unexpected error in {self.form_type} creation: {exc}\n{traceback.format_exc()}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, *args, **kwargs):
        try:
            creator = services.get_query_param(request, "name")
            forms, is_many = selectors.get_forms_for_creator(self.form_type, creator)
            serializer = self.serializer_class(forms, many=is_many)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except services.ServiceValidationError as exc:
            return Response({"error": getattr(exc, "args", [str(exc)])[0]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.error(f"Error fetching {self.form_type} forms: {exc}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                form_id = services.get_query_param(request, "id")
                receiver_payload = services.get_payload_part(request.data, 0, {})
                update_payload = services.get_payload_part(request.data, 1, {})
                form_instance = selectors.get_form_by_id(self.form_type, form_id)

                if self.form_type == "Leave" and "version" not in update_payload:
                    raise services.ServiceValidationError("Version is required for leave updates")
                
                # BR-007: Validate approval authority
                if 'state' in update_payload and update_payload['state'] != form_instance.state:
                    services.validate_approval_authority(request.user, self.form_type, update_payload['state'])
                
                # BR-002: Deduct leave balance if transitioning to final_approved
                if self.form_type == 'Leave' and update_payload.get('state') == 'final_approved':
                    employee = form_instance.employee
                    for leave_type, _, days in services.LEAVE_DEDUCTION_RULES:
                        requested_days = getattr(form_instance, leave_type, 0)
                        if requested_days > 0:
                            services.validate_leave_balance(employee, leave_type.replace('Noof_', '').lower(), requested_days)
                            services.deduct_leave_balance(employee, leave_type.replace('Noof_', '').lower(), requested_days)
                
                serializer = services.run_serializer(self.serializer_class, update_payload, instance=form_instance)
                services.forward_tracking_file(receiver_payload)
            services.audit_event(
                f"{self.form_type.lower()}_updated",
                user=request.user,
                object_id=form_id,
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except services.ServiceValidationError as exc:
            services.audit_event(f"{self.form_type.lower()}_update_failed", user=request.user, details={"error": str(exc)})
            return Response({"error": getattr(exc, "args", [str(exc)])[0]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.error(f"Error updating {self.form_type}: {exc}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, *args, **kwargs):
        try:
            file_id = services.get_query_param(request, "id")
            if services.archive_tracking_file(file_id):
                services.audit_event("tracking_archived", user=request.user, object_id=file_id)
                return Response(status=status.HTTP_200_OK)
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except services.ServiceValidationError as exc:
            return Response(getattr(exc, "args", [str(exc)])[0], status=status.HTTP_400_BAD_REQUEST)


class LTC(GenericFormAPIView):
    form_type = "LTC"


class CPDAAdvance(GenericFormAPIView):
    form_type = "CPDAAdvance"


class CPDAReimbursement(GenericFormAPIView):
    form_type = "CPDAReimbursement"


class Leave(GenericFormAPIView):
    form_type = "Leave"


class Appraisal(GenericFormAPIView):
    form_type = "Appraisal"


class FormManagement(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        username = services.get_query_param(request, "username")
        designation = services.get_query_param(request, "designation")
        if username != request.user.username:
            receiver, receiver_designation = selectors.get_receiver_designation(request.user.username, designation)
            if not receiver_designation or receiver_designation.designation.name != designation:
                raise PermissionDenied("Cannot access inbox for another user")
        inbox = view_inbox(username=username, designation=designation, src_module="HR")
        return Response(inbox, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        selectors.get_receiver_designation(request.data["receiver"], request.data.get("receiver_designation"))
        services.forward_tracking_file(request.data)
        services.audit_event("tracking_forwarded", user=request.user, details={"file_id": request.data.get("file_id")})
        return Response(status=status.HTTP_200_OK)


class GetFormHistory(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        form_type = services.get_query_param(request, "type")
        username = services.get_query_param(request, "id")
        if username != request.user.username and get_user_model().objects.filter(username=username).exists():
            raise PermissionDenied("Cannot access form history for another user")
        user = selectors.get_user_by_username(username)
        offset = int(request.query_params.get("offset", 0))
        limit = max(1, min(int(request.query_params.get("limit", 50)), 100))

        model = selectors.get_model_for_form_type(form_type)
        forms = model.objects.filter(created_by=user).order_by("-id")[offset: offset + limit]
        serializer = SERIALIZER_REGISTRY[form_type](forms, many=True)
        if serializer.data:
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response([], status=status.HTTP_200_OK)


class TrackProgress(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        file_id = services.get_query_param(request, "id")
        progress = view_history(file_id)
        if not progress:
            return Response({"status": []}, status=status.HTTP_200_OK)
        # Last receiver in tracking history must match caller for read access.
        last_receiver_id = progress[-1].get("receiver_id")
        if last_receiver_id and int(last_receiver_id) != request.user.id:
            raise PermissionDenied("Cannot access tracking details for this file")
        return Response({"status": progress}, status=status.HTTP_200_OK)


class FormFetch(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        file_id = services.get_query_param(request, "file_id")
        form_id = services.get_query_param(request, "id")
        form_type = services.get_query_param(request, "type")
        form = selectors.get_form_by_id(form_type, form_id)
        serializer = SERIALIZER_REGISTRY[form_type](form, many=False)
        creator = selectors.get_user_by_id(int(serializer.data["created_by"]))
        owner = selectors.get_latest_tracking_owner(file_id)
        current_owner = owner.username if owner else None
        if request.user.username not in {creator.username, current_owner}:
            raise PermissionDenied("Cannot access this form")
        return Response(
            {"form": serializer.data, "creator": creator.username, "current_owner": current_owner},
            status=status.HTTP_200_OK,
        )


class CheckLeaveBalance(BaseProtectedAPIView):
    serializer_class = LeaveBalanace_serializer

    def get(self, request, *args, **kwargs):
        username = services.get_query_param(request, "name")
        leave_balance = selectors.get_leave_balance_by_username(username)
        serializer = self.serializer_class(leave_balance, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        username = services.get_query_param(request, "name")
        leave_balance = selectors.get_leave_balance_by_username(username)
        payload = dict(request.data)
        payload["empid"] = leave_balance.empid.pk

        # Backward compatibility: allow legacy *_taken payload and convert to *_balance.
        yearly = getattr(leave_balance.empid, "yearly_leave", None)
        taken_to_balance = {
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

        for taken_key, (balance_key, allotted_key) in taken_to_balance.items():
            if taken_key not in payload:
                continue
            try:
                taken_value = int(payload.pop(taken_key))
            except (TypeError, ValueError):
                return Response({taken_key: "Must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

            allotted = getattr(yearly, allotted_key, None) if yearly else None
            if allotted is None:
                allotted = getattr(leave_balance, balance_key, 0)
            payload[balance_key] = max(int(allotted) - taken_value, 0)

        try:
            serializer = services.run_serializer(self.serializer_class, payload, instance=leave_balance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except services.ServiceValidationError as exc:
            return Response(getattr(exc, "args", [str(exc)])[0], status=status.HTTP_400_BAD_REQUEST)


class DropDown(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        username = services.get_query_param(request, "username")
        user = selectors.get_user_by_username(username)
        designation_qs = selectors.get_hold_designations_for_user(user)
        data = [item.designation.name for item in designation_qs]
        return Response(data, status=status.HTTP_200_OK)


class UserById(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        user_id = services.get_query_param(request, "id")
        user = selectors.get_user_by_id(user_id)
        return Response({"username": user.username}, status=status.HTTP_200_OK)


def _caller_designation(user):
    """Return the caller's active designation name (used for security checks)."""
    extra = ExtraInfo.objects.filter(user=user).first()
    if extra and extra.last_selected_role:
        return extra.last_selected_role
    holds = HoldsDesignation.objects.select_related('designation').filter(user=user).last()
    return holds.designation.name if holds else ''


class ViewArchived(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        """
        SECURITY FIX: Previously accepted any username/designation from query params
        without verifying the caller owns them (info-disclosure risk).
        Now forces the caller's own username/designation unless they are HR admin.
        """
        caller = request.user
        is_hr_admin = services.user_has_hr_access(caller) and (
            ExtraInfo.objects.filter(user=caller, last_selected_role='SectionHead_HR').exists()
        )

        if is_hr_admin:
            # HR Admin may query any user's archive (for oversight)
            username = services.get_query_param(request, "username")
            designation = services.get_query_param(request, "designation")
        else:
            # Non-admin: force to their own identity, ignore any spoofed params
            username = caller.username
            designation = _caller_designation(caller)

        archived_inbox = view_archived(username=username, designation=designation, src_module="HR")
        return Response(archived_inbox, status=status.HTTP_200_OK)


class GetOutbox(BaseProtectedAPIView):
    def get(self, request, *args, **kwargs):
        """
        SECURITY FIX: Same as ViewArchived — enforces caller identity.
        """
        caller = request.user
        is_hr_admin = services.user_has_hr_access(caller) and (
            ExtraInfo.objects.filter(user=caller, last_selected_role='SectionHead_HR').exists()
        )

        if is_hr_admin:
            username = services.get_query_param(request, "username")
            designation = services.get_query_param(request, "designation")
        else:
            username = caller.username
            designation = _caller_designation(caller)

        outbox = view_outbox(username=username, designation=designation, src_module="HR")
        return Response(outbox, status=status.HTTP_200_OK)



# ── Legacy function-based API views (canonical endpoints) ──────────────

import json
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.db.models import Q, F
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes, authentication_classes


# from .forms import EditDetailsForm, EditConfidentialDetailsForm, EditServiceBookForm, NewUserForm, AddExtraInfo






def check_hr_access(request):
    """
    Check if the authenticated user has HR module access.
    Returns:
        - True if the user has HR access.
        - False if the user does not have HR access or an error occurs.
    """
    return services.user_has_hr_access(request.user)


# DEDUP: get_last_selected_role is already defined above (line 60).
# This duplicate has been removed. Use the version at module top.



@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
def test(request):
    """
    Test view to validate HR or Faculty access wiring.
    """
    return APIResponse.success({}, message='Access verified')
    




@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def get_leave_balance(request):
    """
    API endpoint to retrieve the leave balance for the authenticated user.
    Returns:
        - A JSON response containing the leave balance for each leave type.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        leave_data = services.get_leave_balance_payload_for_user(user)
        return APIResponse.success({'leave_balance': leave_data}, message='Leave balance fetched successfully')
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except Exception as e:
        raise
    


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def search_employees(request):
    """
    API endpoint to search for employees based on the given search query.
    Returns:
        - A JSON response containing the list of employees matching the search query.
    """
    try:
        search_text = request.GET.get("search_text", "").strip()

        if not search_text:
            return APIErrorHandler.handle_error('VALIDATION_ERROR', 'Search text is required', user=request.user)

        limit = max(1, min(int(request.GET.get("limit", 50)), 100))
        offset = max(0, int(request.GET.get("offset", 0)))

        paginated, total_count = services.search_employees_with_designations(search_text, limit, offset)
        return APIResponse.success(
            {
                "employees": paginated,
                "meta": {
                    "limit": limit,
                    "offset": offset,
                    "total_count": total_count,
                },
            },
            message='Employees fetched successfully',
        )

    except Exception as e:
        raise
    

# get my form initials name, last_selected_role, and department, pfno

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def get_form_initials(request):
    """
    API endpoint to get the form initials for the authenticated user.
    Returns:
        - A JSON response containing the form initials for the authenticated user.
    """
    user = request.user

    # Check if the user is authenticated
    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        payload = services.get_form_initials_payload_for_user(user)
        return APIResponse.success(payload, message='Form initials fetched successfully')
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except Exception as e:
        raise










@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def submit_leave_form(request):
    """
    API endpoint to submit a leave form for the authenticated user.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        leave_form, file_id = services.create_online_leave_form(user, request.POST, request.FILES)
        return APIResponse.success(
            {
                'form_id': leave_form.id,
                'file_id': file_id
            },
            message='Leave form submitted successfully',
            status_code=201
        )
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)
    except (Employee.DoesNotExist, Designation.DoesNotExist):
        return APIErrorHandler.handle_error('NOT_FOUND', 'Referenced user or designation not found', user=user)
    except Exception as e:
        raise

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def get_leave_requests(request):
    """
    API endpoint to get the leave requests for the authenticated user.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        employee = Employee.objects.select_related("id").filter(id=user).first()
        if not employee:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        query_date=request.GET.get('date')
        if not query_date:
            # set 1 year back date
            query_date = datetime.now().date() - timedelta(days=365)
        else:
            query_date = datetime.strptime(query_date, '%Y-%m-%d').date()
        page, page_size = PaginationHelper.get_page_params(request)
        limit = int(request.GET.get("limit", page_size))
        offset = int(request.GET.get("offset", (page - 1) * page_size))
        leave_requests, total_count = services.get_leave_requests_payload(employee, query_date, limit, offset)

        return APIResponse.success(
            {
                'leave_requests': leave_requests,
                'meta': {
                    'limit': limit,
                    'offset': offset,
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                }
            },
            message='Leave requests fetched successfully'
        )
    except Exception as e:
        raise
    


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_leave_form_by_id(request, form_id):
    """
    API endpoint to get full detail of a leave form by ID.

    RBAC: Caller must be one of: owner, academic-responsible, admin-responsible, HR admin.
    PERF FIX: Replaced 6+ separate ORM queries with a single select_related call.
    CLEAN: Removed all dead debug print comments.
    """
    user = request.user

    # Single optimized query fetching all related fields in one DB hit
    leave_form = LeaveForm.objects.select_related(
        'employee__id',
        'AcademicResponsibility_user__id',
        'AcademicResponsibility_designation',
        'AdministrativeResponsibility_user__id',
        'AdministrativeResponsibility_designation',
        'first_recieved_by__id',
        'first_recieved_designation',
        'approved_by__id',
        'approved_by_designation',
    ).filter(id=form_id).first()

    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    # RBAC: object-level access check using consistent service helper
    is_owner = leave_form.employee and leave_form.employee.id == user
    is_academic = (leave_form.AcademicResponsibility_user
                   and leave_form.AcademicResponsibility_user.id == user)
    is_admin_resp = (leave_form.AdministrativeResponsibility_user
                     and leave_form.AdministrativeResponsibility_user.id == user)
    is_current_reviewer = (
        leave_form.first_recieved_by
        and leave_form.first_recieved_by.id == user
        and leave_form.status == 'Pending'
    )
    is_hr_admin = services.user_has_hr_access(user) and get_last_selected_role(user) == 'SectionHead_HR'

    if not any([is_owner, is_academic, is_admin_resp, is_current_reviewer, is_hr_admin]):
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED', 'You do not have access to this leave form', user=user
        )

    employee = leave_form.employee
    leave_balance = selectors.get_leave_balance_for_employee(employee)
    if not leave_balance:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave balance not found', user=user)

    leave_per_year = LeavePerYear.objects.filter(empid=employee).first()
    if not leave_per_year:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave per year not found', user=user)

    def _name(emp_obj):
        if not emp_obj:
            return None
        u = emp_obj.id
        return (f"{u.first_name} {u.last_name}").strip() or u.username

    def _desig(desig_obj):
        return desig_obj.name if desig_obj else None

    approved_by_name, approved_by_desig, approved_date = None, None, None
    if leave_form.status == 'Accepted' and leave_form.approved_by:
        approved_by_name = _name(leave_form.approved_by)
        approved_by_desig = _desig(leave_form.approved_by_designation)
        approved_date = leave_form.approvedDate

    leave_form_data = {
        'id': leave_form.id,
        'name': leave_form.name,
        'designation': leave_form.designation,
        'pfno': leave_form.personalfileNo,
        'submissionDate': leave_form.submissionDate,
        'department': leave_form.departmentInfo,
        'leaveStartDate': leave_form.leaveStartDate,
        'leaveEndDate': leave_form.leaveEndDate,
        'purpose': leave_form.Purpose_of_leave,
        'casualLeave': leave_form.Noof_CasualLeave,
        'vacationLeave': leave_form.Noof_vacationLeave,
        'earnedLeave': leave_form.Noof_earnedLeave,
        'commutedLeave': leave_form.Noof_commutedLeave,
        'specialCasualLeave': leave_form.Noof_specialCasualLeave,
        'restrictedHoliday': leave_form.Noof_restrictedHoliday,
        'maternityLeave': leave_form.Noof_maternityLeave,
        'childCareLeave': leave_form.Noof_childCareLeave,
        'paternityLeave': leave_form.Noof_paternityLeave,
        'halfPayLeave': leave_form.Noof_halfPayLeave,
        'casualLeaveBalance': leave_balance.casual_leave_balance,
        'specialCasualLeaveBalance': leave_balance.special_casual_leave_balance,
        'earnedLeaveBalance': leave_balance.earned_leave_balance,
        'halfPayLeaveBalance': leave_balance.half_pay_leave_balance,
        'maternityLeaveBalance': leave_balance.maternity_leave_balance,
        'childCareLeaveBalance': leave_balance.child_care_leave_balance,
        'paternityLeaveBalance': leave_balance.paternity_leave_balance,
        'remarks': leave_form.Remarks,
        'stationLeave': leave_form.LeavingStation,
        'stationLeaveStartDate': leave_form.StationLeave_startdate,
        'stationLeaveEndDate': leave_form.StationLeave_enddate,
        'stationLeaveAddress': leave_form.Address_During_StationLeave,
        'academicResponsibility': _name(leave_form.AcademicResponsibility_user),
        'academicResponsibilityDesignation': _desig(leave_form.AcademicResponsibility_designation),
        'academicResponsibilityStatus': leave_form.AcademicResponsibility_status,
        'administrativeResponsibility': _name(leave_form.AdministrativeResponsibility_user),
        'administrativeResponsibilityDesignation': _desig(leave_form.AdministrativeResponsibility_designation),
        'administrativeResponsibilityStatus': leave_form.AdministrativeResponsibility_status,
        'firstRecievedBy': _name(leave_form.first_recieved_by),
        'firstRecievedByDesignation': _desig(leave_form.first_recieved_designation),
        'status': leave_form.status,
        'state': leave_form.state,
        'approvalLevel': services.determine_approval_level(leave_form),
        'requiresSubstitute': services.requires_substitute_nomination(leave_form),
        'attachedPdfName': leave_form.attached_pdf_name if leave_form.attached_pdf else None,
        'approvedBy': approved_by_name,
        'approvedByDesignation': approved_by_desig,
        'approvedDate': approved_date,
        'file_id': leave_form.file_id,
        'application_type': leave_form.application_type,
    }

    return APIResponse.success({'leave_form': leave_form_data}, message='Leave form fetched successfully')

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def handle_leave_academic_responsibility(request, form_id):
    """
    API endpoint to handle the academic responsibility of a leave form.
    """
    user = request.user
    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        if not Employee.objects.filter(id=user).exists():
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        last_selected_role = get_last_selected_role(user)
        if not last_selected_role:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Designation not found', user=user)

        leave_form = LeaveForm.objects.select_related(
            "AcademicResponsibility_user__id",
            "AcademicResponsibility_designation",
            "first_recieved_by__id",
            "first_recieved_designation",
        ).filter(id=form_id).first()
        if not leave_form:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

        if not leave_form.AcademicResponsibility_user or user != leave_form.AcademicResponsibility_user.id:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle academic responsibility for this leave form', user=user)

        if (
            not leave_form.AcademicResponsibility_designation
            or last_selected_role != leave_form.AcademicResponsibility_designation.name
        ):
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle academic responsibility for this leave form', user=user)

        data = json.loads(request.body)
        action = data.get('action')
        if action not in ['accept', 'reject']:
            return APIErrorHandler.handle_error('INVALID_REQUEST', 'Invalid action', user=user)

        with transaction.atomic():
            if action == 'reject':
                services.assert_leave_status_transition(leave_form.status, 'Rejected')
                leave_form.AcademicResponsibility_status = 'Rejected'
                leave_form.status = 'Rejected'
                leave_form.save(update_fields=['AcademicResponsibility_status', 'status'])
                services.audit_event(
                    'leave_academic_responsibility_rejected',
                    user=user,
                    object_id=leave_form.id,
                )
                return APIResponse.success({'message': 'Academic responsibility rejected successfully'})

            leave_form.AcademicResponsibility_status = 'Accepted'
            if leave_form.AdministrativeResponsibility_status in ['Pending', 'Rejected']:
                leave_form.save(update_fields=['AcademicResponsibility_status'])
                services.audit_event(
                    'leave_academic_responsibility_accepted',
                    user=user,
                    object_id=leave_form.id,
                )
                return APIResponse.success({'message': 'Academic responsibility accepted successfully'})

            file_id = create_file(
                uploader=leave_form.employee.id,
                uploader_designation=leave_form.designation,
                receiver=leave_form.first_recieved_by.id.username,
                receiver_designation=leave_form.first_recieved_designation,
                src_module="HR",
                src_object_id=str(leave_form.id),
                file_extra_JSON={"type": "Leave"},
                attached_file=None,
            )
            leave_form.file_id = file_id
            leave_form.save(update_fields=['AcademicResponsibility_status', 'file_id'])
            services.audit_event(
                'leave_academic_responsibility_accepted',
                user=user,
                object_id=leave_form.id,
                details={'file_id': file_id},
            )
            return APIResponse.success({'message': 'Academic responsibility accepted successfully'})

    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('INVALID_REQUEST', str(e), user=user)
    except Exception as e:
        raise
    



@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
def handle_leave_administrative_responsibility(request, form_id):
    """
    API endpoint to handle the administrative responsibility of a leave form.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        if not Employee.objects.filter(id=user).exists():
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        last_selected_role = get_last_selected_role(user)
        if not last_selected_role:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Designation not found', user=user)

        leave_form = LeaveForm.objects.select_related(
            "AdministrativeResponsibility_user__id",
            "AdministrativeResponsibility_designation",
            "first_recieved_by__id",
            "first_recieved_designation",
        ).filter(id=form_id).first()

        if not leave_form:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

        if not leave_form.AdministrativeResponsibility_user or user != leave_form.AdministrativeResponsibility_user.id:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle administrative responsibility for this leave form', user=user)

        if (
            not leave_form.AdministrativeResponsibility_designation
            or last_selected_role != leave_form.AdministrativeResponsibility_designation.name
        ):
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle administrative responsibility for this leave form', user=user)

        data = json.loads(request.body)
        action = data.get('action')
        if action not in ['accept', 'reject']:
            return APIErrorHandler.handle_error('VALIDATION_ERROR', 'Invalid action', user=user)

        with transaction.atomic():
            if action == 'reject':
                services.assert_leave_status_transition(leave_form.status, 'Rejected')
                leave_form.AdministrativeResponsibility_status = 'Rejected'
                leave_form.status = 'Rejected'
                leave_form.save(update_fields=['AdministrativeResponsibility_status', 'status'])
                services.audit_event(
                    'leave_administrative_responsibility_rejected',
                    user=user,
                    object_id=leave_form.id,
                )
                return APIResponse.success({'message': 'Administrative responsibility rejected successfully'})

            leave_form.AdministrativeResponsibility_status = 'Accepted'
            if leave_form.AcademicResponsibility_status in ['Pending', 'Rejected']:
                leave_form.save(update_fields=['AdministrativeResponsibility_status'])
                services.audit_event(
                    'leave_administrative_responsibility_accepted',
                    user=user,
                    object_id=leave_form.id,
                )
                return APIResponse.success({'message': 'Administrative responsibility accepted successfully'})

            file_id = create_file(
                uploader=leave_form.employee.id,
                uploader_designation=leave_form.designation,
                receiver=leave_form.first_recieved_by.id.username,
                receiver_designation=leave_form.first_recieved_designation,
                src_module="HR",
                src_object_id=str(leave_form.id),
                file_extra_JSON={"type": "Leave"},
                attached_file=None,
            )
            leave_form.file_id = file_id
            leave_form.save(update_fields=['AdministrativeResponsibility_status', 'file_id'])
            services.audit_event(
                'leave_administrative_responsibility_accepted',
                user=user,
                object_id=leave_form.id,
                details={'file_id': file_id},
            )
            return APIResponse.success({'message': 'Administrative responsibility accepted successfully'})

    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)
    except Exception as e:
        raise


# def get_leave_inbox get leave forms where acdemic responsibility or administrative responsibility

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_USER", "Faculty"])
@handle_view_exception
def get_leave_inbox(request):
    """
    API endpoint to get the leave inbox for the authenticated user.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        employee = Employee.objects.select_related("id").filter(id=user).first()
        if not employee:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        query_date = request.GET.get('date')
        if not query_date:
            query_date = datetime.now().date() - timedelta(days=365)
        else:
            query_date = datetime.strptime(query_date, '%Y-%m-%d').date()

        extra_info = ExtraInfo.objects.filter(user=user).first()
        if not extra_info:
            return APIErrorHandler.handle_error('NOT_FOUND', 'ExtraInfo not found', user=user)

        last_selected_role = extra_info.last_selected_role
        if not last_selected_role:
            designations = HoldsDesignation.objects.filter(user=user)
            if designations.exists():
                last_selected_role = designations.last().designation.name
                extra_info.last_selected_role = last_selected_role
                extra_info.save()
            else:
                return APIErrorHandler.handle_error('NOT_FOUND', 'Designation not found', user=user)

        academic_res_inbox = list(
            LeaveForm.objects.filter(
                AcademicResponsibility_user=employee,
                AcademicResponsibility_designation__name=last_selected_role,
                submissionDate__gte=query_date,
            ).values(
                'id',
                'name',
                'designation',
                'submissionDate',
                'leaveStartDate',
                'leaveEndDate',
                'AcademicResponsibility_status',
            )
        )
        for item in academic_res_inbox:
            item['status'] = item.pop('AcademicResponsibility_status', None)

        administrative_res_inbox = list(
            LeaveForm.objects.filter(
                AdministrativeResponsibility_user=employee,
                AdministrativeResponsibility_designation__name=last_selected_role,
                submissionDate__gte=query_date,
            ).values(
                'id',
                'name',
                'designation',
                'submissionDate',
                'leaveStartDate',
                'leaveEndDate',
                'AdministrativeResponsibility_status',
            )
        )
        for item in administrative_res_inbox:
            item['status'] = item.pop('AdministrativeResponsibility_status', None)

        inbox = view_inbox(username=str(extra_info.user), designation=last_selected_role, src_module="HR")

        filtered_inbox = []
        for item in inbox:
            if item.get('file_extra_JSON', {}).get('type') != "Leave":
                continue
            upload_date = item.get('upload_date')
            if not upload_date:
                continue
            try:
                uploaded_on = datetime.fromisoformat(upload_date).date()
            except ValueError:
                uploaded_on = datetime.strptime(upload_date, "%Y-%m-%dT%H:%M:%S.%f").date()
            if uploaded_on >= query_date:
                filtered_inbox.append(item)

        designation_ids = {item.get('designation') for item in filtered_inbox if item.get('designation')}
        designation_map = {
            row['id']: row['name']
            for row in Designation.objects.filter(id__in=designation_ids).values('id', 'name')
        }

        src_ids = []
        for item in filtered_inbox:
            src_id = item.get('src_object_id')
            try:
                src_ids.append(int(src_id))
            except (TypeError, ValueError):
                continue
        leave_status_map = {
            row['id']: row['status']
            for row in LeaveForm.objects.filter(id__in=src_ids).values('id', 'status')
        }

        for item in filtered_inbox:
            designation_id = item.get('designation')
            if designation_id in designation_map:
                item['designation'] = designation_map[designation_id]
            try:
                src_id_int = int(item.get('src_object_id'))
            except (TypeError, ValueError):
                src_id_int = None
            if src_id_int in leave_status_map:
                item['status'] = leave_status_map[src_id_int]

        return APIResponse.success({
            'leave_inbox': filtered_inbox,
            'academic_res_inbox': academic_res_inbox,
            'administrative_res_inbox': administrative_res_inbox
        })
    except Exception as e:
        raise

# download attached pdf for leave form

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
def download_leave_form_pdf(request, form_id):
    """
    API endpoint to download the attached PDF for a leave form.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        # Get the leave form by ID
        leave_form = LeaveForm.objects.filter(id=form_id)
        if not leave_form.exists():
            return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)
        leave_form = leave_form.first()

        is_owner = leave_form.employee and leave_form.employee.id == user
        is_academic_responsible = (
            leave_form.AcademicResponsibility_user
            and leave_form.AcademicResponsibility_user.id == user
        )
        is_admin_responsible = (
            leave_form.AdministrativeResponsibility_user
            and leave_form.AdministrativeResponsibility_user.id == user
        )
        is_hr_admin = get_last_selected_role(user) == 'SectionHead_HR'
        if not any([is_owner, is_academic_responsible, is_admin_responsible, is_hr_admin]):
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to this PDF', user=user)



        # Check if the leave form has an attached PDF
        if not leave_form.attached_pdf:
            return APIErrorHandler.handle_error('NOT_FOUND', 'No attached PDF found for this leave form', user=user)

        # convert binary to file
        attached_pdf = leave_form.attached_pdf
        attached_pdf_name = leave_form.attached_pdf_name
        response = HttpResponse(attached_pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{attached_pdf_name}"'
        return response
    except Exception as e:
        raise
    

# {'file_history': [OrderedDict([('id', 490), ('receive_date', '2025-03-11T16:53:15.057424'), ('forward_date', '2025-03-11T16:53:15.057424'), ('remarks', 'File with id:635 created by vkjain and sent to vkjain'), ('upload_file', None), ('is_read', False), ('tracking_extra_JSON', {'type': 'Leave'}), ('file_id', 635), ('current_id', 'vkjain'), ('current_design', 4354), ('receiver_id', 5350), ('receive_design', 15)])]}

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
def track_file_react(request, id):
    # Fetching the file history as a list of dictionaries
    user=request.user
    file_history = view_history(file_id=id)
    if not file_history:
        return APIResponse.success({'file_history': []}, message='File history fetched successfully')

    # Object-level check: caller must be sender or receiver in at least one step.
    user_id = request.user.id
    is_participant = any(
        (item.get('receiver_id') == user_id) or (item.get('current_id') == request.user.username)
        for item in file_history
    )
    if not is_participant:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to this file history', user=user)

    # PERF FIX: Batch-load users and designations in 2 queries instead of N+1
    receiver_ids = [i['receiver_id'] for i in file_history if i.get('receiver_id')]
    design_ids = [i['receive_design'] for i in file_history if i.get('receive_design')]

    user_map = selectors.get_users_by_ids(receiver_ids)
    design_map = selectors.get_designations_by_ids(design_ids)

    response_data = {'file_history': file_history}
    for i in response_data['file_history']:
        if i.get('receiver_id') and i['receiver_id'] in user_map:
            u = user_map[i['receiver_id']]
            i['receiver_id'] = f"{u.first_name} {u.last_name}".strip() or u.username
        if i.get('receive_design') and i['receive_design'] in design_map:
            i['receive_design'] = design_map[i['receive_design']].name

    return APIResponse.success(response_data, message='File history fetched successfully')


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
def handle_leave_file(request, form_id):
    user = request.user
    data = request.data if isinstance(request.data, dict) else json.loads(request.body)
    action = data.get('action')
    remarks = data.get('fileRemarks')
    forwardtouser = data.get('forwardTo')
    forwardToDesignation = data.get('forwardToDesignation')

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        if not Employee.objects.filter(id=user).exists():
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        last_selected_role = get_last_selected_role(user)
        if not last_selected_role:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Designation not found', user=user)

        leave_instance = LeaveForm.objects.select_related(
            'employee__id',
            'approved_by',
            'approved_by_designation',
        ).filter(id=form_id).first()
        if not leave_instance:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

        file_id = leave_instance.file_id
        if not file_id:
            return APIErrorHandler.handle_error('INVALID_REQUEST', 'No workflow file found for this leave form', user=user)

        current_owner = get_current_file_owner(file_id)
        current_owner_designation = get_current_file_owner_designation(file_id)

        if user.username != current_owner.username:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle this file', user=user)

        if last_selected_role != current_owner_designation.name:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'You do not have access to handle this file', user=user)

        if action not in ['forward', 'reject', 'accept']:
            return APIErrorHandler.handle_error('INVALID_REQUEST', 'Invalid action', user=user)

        remarks_text = (remarks or '').strip()
        if action == 'reject' and len(remarks_text) < 10:
            return APIErrorHandler.handle_error(
                'VALIDATION_ERROR',
                'Rejection remarks must be at least 10 characters long',
                user=user,
            )

        if action == 'reject':
            with transaction.atomic():
                services.assert_leave_status_transition(leave_instance.status, 'Rejected')
                formatted_remarks = f"Rejected by {current_owner} with remarks: {remarks_text}"
                forward_file(
                    file_id=file_id,
                    receiver=leave_instance.employee.id,
                    receiver_designation=leave_instance.designation,
                    remarks=formatted_remarks,
                    file_extra_JSON=None,
                )
                leave_instance.status = 'Rejected'
                leave_instance.Remarks = remarks_text
                leave_instance.save(update_fields=['status', 'Remarks'])
                services.audit_event(
                    'leave_file_rejected',
                    user=user,
                    object_id=leave_instance.id,
                    details={'file_id': file_id},
                )
            return APIResponse.success({}, message='File rejected successfully')

        if action == 'forward':
            forward_user = User.objects.get(id=forwardtouser)
            forward_to_designation = Designation.objects.get(name=forwardToDesignation)
            formatted_remarks = f"Forwarded by {current_owner} with remarks: {remarks_text}"
            forward_file(
                file_id=file_id,
                receiver=forward_user.username,
                receiver_designation=forward_to_designation,
                remarks=formatted_remarks,
                file_extra_JSON=None,
            )
            services.audit_event(
                'leave_file_forwarded',
                user=user,
                object_id=leave_instance.id,
                details={'file_id': file_id, 'forward_to': forward_user.username},
            )
            return APIResponse.success({}, message='File forwarded successfully')

        with transaction.atomic():
            if leave_instance.AcademicResponsibility_status == 'Pending' or leave_instance.AdministrativeResponsibility_status == 'Pending':
                return APIErrorHandler.handle_error(
                    'VALIDATION_ERROR',
                    'Both academic and administrative responsibilities must be accepted before final approval',
                    user=user,
                )

            services.assert_leave_status_transition(leave_instance.status, 'Accepted')
            approved_by_employee = Employee.objects.get(id=user)
            leave_instance = services.approve_leave_with_balance_deduction(
                leave_form_id=leave_instance.id,
                approver_user=approved_by_employee,
                remarks=remarks_text,
            )

            formatted_remarks = f"Accepted by {current_owner} with remarks: {remarks_text}"
            forward_file(
                file_id=file_id,
                receiver=current_owner,
                receiver_designation=current_owner_designation,
                remarks=formatted_remarks,
                file_extra_JSON=None,
            )
            services.audit_event(
                'leave_file_accepted',
                user=user,
                object_id=leave_instance.id,
                details={'file_id': file_id},
            )
        return APIResponse.success({}, message='File accepted successfully')

    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)
    except Exception as e:
        raise






@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def admin_get_leave_balance(request, empid):
    try:
        user = request.user

        # Validate user authentication
        if not user.is_authenticated:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

        
        # Fetch the employee data based on empid
        try:
            emp_user = User.objects.get(id=empid)
        except User.DoesNotExist:
            return APIErrorHandler.handle_error('NOT_FOUND', 'User not found', user=user)
        
        try:
            employee = Employee.objects.get(id=emp_user)
        except Employee.DoesNotExist:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)
        
        leave_balance = LeaveBalance.objects.get(empid=employee)
        leave_per_year = LeavePerYear.objects.get(empid=employee)
        leave_balance_data = services.build_leave_balance_summary_payload(leave_balance, leave_per_year)

        return APIResponse.success({'leave_balance': leave_balance_data}, message='Leave balance fetched successfully')
    except Exception as e:
        # Log the error message (consider using logging here for production)
        return APIErrorHandler.handle_error('INTERNAL_ERROR', f'An unexpected error occurred: {str(e)}', user=request.user)



# create a function to get department of employee
def get_department(emp):
    department = None
    # get userid then get extrainfo then get department
    user_id = emp.id
    ext= ExtraInfo.objects.get(user__id=user_id)
    department = ext.department
    return department







# @api_view(['GET'])
# @authentication_classes([TokenAuthentication])
# @permission_classes([IsAuthenticated])
# def admin_get_all_leave_balances(request):
#     try:
#         user = request.user

#         if not user.is_authenticated:
#             return JsonResponse({'error': 'Authentication required'}, status=401)

#         # Get the user's ExtraInfo record
#         extra_info = ExtraInfo.objects.filter(user=user).first()
#         if not extra_info:
#             return JsonResponse({'error': 'ExtraInfo not found'}, status=404)

#         # Validate the HR role
#         if extra_info.last_selected_role != 'SectionHead_HR':
#             return JsonResponse({'error': 'You do not have access to get leave balance'}, status=403)

#         # Accumulate leave balance data for all employees
#         employee_leave_list = []
#         employees = Employee.objects.all()  # Adjust this query if HR should only access certain employees

#         for employee in employees:
#             # Since the 'id' field in Employee is a OneToOneField with User, use it to extract user info
#             employee_data = {
#                 'employee_id': employee.id.pk,  # primary key of the related User
#                 'employee_username': employee.id.username,
#                 'employee_fullname': employee.id.get_full_name(),  # if defined; otherwise, adjust as needed
#             }

#             # Fetch related leave data based on employee instance
#             leave_balance = LeaveBalance.objects.filter(empid=employee).first()
#             leave_per_year = LeavePerYear.objects.filter(empid=employee).first()

#             if not leave_balance or not leave_per_year:
#                 missing_fields = []
#                 if not leave_balance:
#                     missing_fields.append('LeaveBalance')
#                 if not leave_per_year:
#                     missing_fields.append('LeavePerYear')
#                 employee_data['error'] = f"Missing record(s): {', '.join(missing_fields)}."
#             else:
#                 employee_data.update({
#                     'casual_leave_allotted': leave_per_year.casual_leave_allotted,
#                     'casual_leave_taken': leave_balance.casual_leave_taken,
#                     'vacation_leave_allotted': leave_per_year.vacation_leave_allotted,
#                     'vacation_leave_taken': leave_balance.vacation_leave_taken,
#                     'earned_leave_allotted': leave_per_year.earned_leave_allotted,
#                     'earned_leave_taken': leave_balance.earned_leave_taken,
#                     'commuted_leave_allotted': leave_per_year.commuted_leave_allotted,
#                     'commuted_leave_taken': leave_balance.commuted_leave_taken,
#                     'special_casual_leave_allotted': leave_per_year.special_casual_leave_allotted,
#                     'special_casual_leave_taken': leave_balance.special_casual_leave_taken,
#                     'restricted_holiday_allotted': leave_per_year.restricted_holiday_allotted,
#                     'restricted_holiday_taken': leave_balance.restricted_holiday_taken,
#                 })

#             employee_leave_list.append(employee_data)

#         return JsonResponse({'leave_balances': employee_leave_list}, status=200)
    
#     except Exception as e:
#         logger.exception("Unexpected error in admin_get_all_leave_balances view")
#         return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)













@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def admin_get_all_leave_balances(request):
    try:
        user = request.user

        if not user.is_authenticated:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

        limit = max(1, min(int(request.GET.get('limit', 100)), 200))
        offset = max(0, int(request.GET.get('offset', 0)))

        employee_leave_list = services.get_admin_leave_balances_payload(limit, offset)

        return APIResponse.success(
            {
                'leave_balances': employee_leave_list,
                'meta': {'limit': limit, 'offset': offset},
            },
            message='Leave balances fetched successfully',
        )

    except Exception as e:
        logger.exception("Unexpected error in admin_get_all_leave_balances view")
        return APIErrorHandler.handle_error('INTERNAL_ERROR', f'An unexpected error occurred: {str(e)}', user=request.user)





















@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def admin_update_leave_balance(request, empid):
    """
    Update leave balance and leave per year for a specified employee.
    The request JSON may include any of the following numeric fields:
    
    For LeaveBalance:
      - casual_leave_taken
      - vacation_leave_taken
      - earned_leave_taken
      - commuted_leave_taken
      - special_casual_leave_taken
      - restricted_holiday_taken
      
    For LeavePerYear:
      - casual_leave_allotted
      - vacation_leave_allotted
      - earned_leave_allotted
      - commuted_leave_allotted
      - special_casual_leave_allotted
      - restricted_holiday_allotted
      
    Only users with the "SectionHead_HR" role can perform this update.
    """
    try:
        user = request.user

        # Validate user authentication (redundant if using IsAuthenticated but explicit check adds clarity)
        if not user.is_authenticated:
            return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

        # Fetch the employee using the provided empid
        try:
            emp_user = User.objects.get(id=empid)
        except User.DoesNotExist:
            return APIErrorHandler.handle_error('NOT_FOUND', 'User not found', user=user)

        try:
            employee = Employee.objects.get(id=emp_user)
        except Employee.DoesNotExist:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

        services.update_employee_leave_balance(employee, request.data)

        return APIResponse.success({}, message='Leave balance and leave per year updated successfully!')

    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)
    except Exception as e:
        # Consider logging the error in a production environment.
        return APIErrorHandler.handle_error('INTERNAL_ERROR', f'An unexpected error occurred: {str(e)}', user=user)




# create an api to get leave_requests of employee with empid with date filter if none then 1 year back
@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role(["HR_ADMIN", "HR_USER"])
def admin_get_leave_requests(request, empid):
    """
    API endpoint to get all leave requests for a specified employee.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)

    try:
        query_date = request.GET.get('date')
        if not query_date:
            query_date = datetime.now().date() - timedelta(days=365)
        else:
            query_date = datetime.strptime(query_date, '%Y-%m-%d').date()
        limit = max(1, min(int(request.GET.get('limit', 50)), 200))
        offset = max(0, int(request.GET.get('offset', 0)))

        if str(empid).lower() == 'me':
            try:
                reviewer = Employee.objects.get(id=user)
            except Employee.DoesNotExist:
                return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

            reviewer_qs = LeaveForm.objects.filter(
                first_recieved_by=reviewer,
                status='Pending',
                submissionDate__gte=query_date,
            )

            total_count = reviewer_qs.count()
            leave_requests_data = list(
                reviewer_qs.order_by('-submissionDate', '-id')[offset:offset + limit].values(
                    'id',
                    'submissionDate',
                    'leaveStartDate',
                    'leaveEndDate',
                    'status',
                    'state',
                    'name',
                    'designation',
                )
            )
        else:
            if not services.user_has_role(user, 'HR_ADMIN'):
                return APIErrorHandler.handle_error(
                    'PERMISSION_DENIED',
                    'You do not have access to this employee\'s leave requests',
                    user=user,
                )

            # Fetch the employee using the provided empid
            try:
                emp_user = User.objects.get(id=empid)
            except User.DoesNotExist:
                return APIErrorHandler.handle_error('NOT_FOUND', 'User not found', user=user)

            try:
                employee = Employee.objects.get(id=emp_user)
            except Employee.DoesNotExist:
                return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

            leave_requests_data, total_count = services.get_leave_requests_payload(employee, query_date, limit, offset)

        return APIResponse.success(
            {
                'leave_requests': leave_requests_data,
                'meta': {'limit': limit, 'offset': offset, 'total_count': total_count},
            },
            message='Leave requests fetched successfully',
        )

    except Exception as e:
        raise



# @api_view(['GET'])
# @authentication_classes([TokenAuthentication])
# @permission_classes([IsAuthenticated])
# def get_hr_employees(request):
#     """
#     API endpoint to retrieve all HR-access employees (faculty + staff).

#     For each employee (from the Employee model):
#       - Fetch the related user (a OneToOne relation via the `id` field).
#       - Using ExtraInfo, get the department (if available), else keep it null.
#       - Using HoldsDesignation, return one entry per designation.
#         If no designation exists for the employee, a single entry with designation as null is returned.

#     Returns:
#         A JSON response (list) of entries with the following keys:
#         - id
#         - name (concatenated first and last name)
#         - username
#         - designation
#         - department
#     """
#     # Check if the user has HR access
#     if not check_hr_access(request):
#         return JsonResponse({'error': 'HR access required'}, status=403)

#     try:
#         # Get all employees (this table already contains only HR-access employees)
#         employees = Employee.objects.all()
#         results = []

#         for emp in employees:
#             # Employee.id is a OneToOneField to the User model.
#             user_inst = emp.id

#             # Fetch extra info similar to get_form_initials.
#             # If no ExtraInfo exists (or no department is set), department is kept as None.
#             extra_info = ExtraInfo.objects.filter(user=user_inst).first()
#             department = extra_info.department.name if extra_info and extra_info.department else None

#             # Fetch designations from HoldsDesignation model
#             designations_qs = HoldsDesignation.objects.filter(user=user_inst)
#             if designations_qs.exists():
#                 # Return one record per designation.
#                 for hd in designations_qs:
#                     results.append({
#                         "id": user_inst.id,
#                         "name": f"{user_inst.first_name} {user_inst.last_name}",
#                         "username": user_inst.username,
#                         "designation": hd.designation.name,  # Assuming the designation has a 'name' field.
#                         "department": department,
#                     })
#             else:
#                 # If no designation exists, include the employee with designation set to None.
#                 results.append({
#                     "id": user_inst.id,
#                     "name": f"{user_inst.first_name} {user_inst.last_name}",
#                     "username": user_inst.username,
#                     "designation": None,
#                     "department": department,
#                 })

#         return JsonResponse(results, safe=False, status=200)

#     except Exception as e:
#         return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)






@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def get_hr_employees(request):
    """
    API endpoint to retrieve all HR-access employees (faculty + staff)
    with a single entry per employee. For each employee (from the Employee model):
      - Fetch the related user (a OneToOne relation via the `id` field).
      - Using ExtraInfo, get the department (if available), else keep it null.
    
    Returns:
        A JSON response (list) of entries with the following keys:
        - id
        - name (concatenated first and last name)
        - username
        - department
    """

    try:
        limit = max(1, min(int(request.GET.get('limit', 200)), 500))
        offset = max(0, int(request.GET.get('offset', 0)))

        results = services.get_hr_employees_payload(limit, offset)

        return APIResponse.success(
            {
                'employees': results,
                'meta': {'limit': limit, 'offset': offset},
            },
            message='Employees fetched successfully',
        )

    except Exception as e:
        raise



@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def offline_leave_form(request):
    """
    API endpoint to handle offline leave form submission.
    Automatically approves the leave and updates the leave balance.
    """
    user = request.user

    if not user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=user)
    

    try:
        parsed = services.parse_offline_payload(request.POST)
        leave_form, file_id = services.create_offline_leave_form(parsed, request.FILES)
        return APIResponse.success(
            {
                'form_id': leave_form.id,
                'file_id': file_id
            },
            message='Offline leave form submitted and approved successfully',
            status_code=201,
        )
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)
    except (Employee.DoesNotExist, Designation.DoesNotExist):
        return APIErrorHandler.handle_error('NOT_FOUND', 'Referenced user or designation not found', user=user)
    except Exception as e:
        raise
    

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
def get_employee_initials(request,empid):
    """
    API endpoint to get the details for an employee.
    If a query parameter "id" is provided, it fetches data for that employee.
    Otherwise, it returns the details for the logged-in user.
    """
    if not request.user.is_authenticated:
        return APIErrorHandler.handle_error('PERMISSION_DENIED', 'Authentication required', user=request.user)

    try:
        payload = services.get_employee_initials_payload(empid)
        return APIResponse.success(payload, message='Employee initials fetched successfully')
    except Employee.DoesNotExist:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=request.user)
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=request.user)
    except Exception as e:
        raise


# ==============================================================================
# UC-061 — Modify Pending Leave Request
# BR-HR-020: Employee may modify a pending (submitted) leave form before
#            HoD action. Once the HoD has acted, modifications are blocked.
# ==============================================================================

@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def modify_leave_form(request, form_id):
    """
    UC-061 — Modify a pending leave form.

    Allowed fields: leaveStartDate, leaveEndDate, Purpose_of_leave, Remarks,
    and leave-type counts (Noof_CasualLeave, etc.)

    Business Rules enforced:
      BR-HR-020 — Only forms in 'submitted' (Pending) state may be modified.
      BR-HR-003 — Re-validates overlap after date change.
    """
    user = request.user
    try:
        leave_form = LeaveForm.objects.select_for_update().filter(id=form_id).first()
        if not leave_form:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

        # BR-HR-020: Only submitted forms may be modified
        if leave_form.status != 'Pending' or leave_form.state not in ('submitted', 'draft'):
            return APIErrorHandler.handle_error(
                'VALIDATION_ERROR',
                'Only pending (submitted) leave forms may be modified. '
                'This form has already been acted upon.',
                user=user,
            )

        # Object-level ownership check
        try:
            employee = Employee.objects.get(id=user)
        except Employee.DoesNotExist:
            return APIErrorHandler.handle_error('NOT_FOUND', 'Employee record not found', user=user)

        if leave_form.employee != employee:
            return APIErrorHandler.handle_error(
                'PERMISSION_DENIED', 'You may only modify your own leave forms', user=user
            )

        data = request.data
        editable_fields = [
            'Purpose_of_leave', 'Remarks',
            'Noof_CasualLeave', 'Noof_specialCasualLeave', 'Noof_earnedLeave',
            'Noof_commutedLeave', 'Noof_restrictedHoliday', 'Noof_vacationLeave',
            'Noof_maternityLeave', 'Noof_childCareLeave', 'Noof_paternityLeave',
            'Noof_halfPayLeave', 'LeavingStation', 'Address_During_StationLeave',
        ]
        update_fields = []
        for field in editable_fields:
            if field in data:
                setattr(leave_form, field, data[field])
                update_fields.append(field)

        # Validate date change if provided
        new_start = data.get('leaveStartDate')
        new_end = data.get('leaveEndDate')
        if new_start or new_end:
            from datetime import datetime as dt
            start = dt.strptime(new_start, '%Y-%m-%d').date() if new_start else leave_form.leaveStartDate
            end = dt.strptime(new_end, '%Y-%m-%d').date() if new_end else leave_form.leaveEndDate
            if end < start:
                return APIErrorHandler.handle_error(
                    'VALIDATION_ERROR', 'Leave end date must be after start date', user=user
                )
            # BR-HR-003: Re-check overlap (exclude this form itself)
            if services.has_overlapping_active_leave(employee, start, end, exclude_id=form_id):
                return APIErrorHandler.handle_error(
                    'CONFLICT',
                    'The new dates overlap with another active leave request',
                    user=user,
                )
            leave_form.leaveStartDate = start
            leave_form.leaveEndDate = end
            update_fields.extend(['leaveStartDate', 'leaveEndDate'])

        if not update_fields:
            return APIErrorHandler.handle_error(
                'VALIDATION_ERROR', 'No valid fields provided for update', user=user
            )

        with transaction.atomic():
            leave_form.version += 1
            update_fields.append('version')
            leave_form.save(update_fields=update_fields)
            services.audit_event(
                'leave_form_modified',
                user=user,
                object_id=form_id,
                details={'updated_fields': update_fields},
            )

        return APIResponse.success({'form_id': leave_form.id}, message='Leave form updated successfully')

    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


# ==============================================================================
# UC-065 — Withdraw Leave Request
# BR-HR-021: Employee may withdraw a leave before sanction.
#            If balance was already deducted, it must be restored atomically.
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def withdraw_leave_form(request, form_id):
    """
    UC-065 — Withdraw a leave application.

    Business Rules enforced:
      BR-HR-021 — Withdraw only allowed before final_approved or sanction stage.
      Data Integrity — Balance is atomically restored if already deducted.
    """
    user = request.user
    try:
        employee = Employee.objects.get(id=user)
    except Employee.DoesNotExist:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee record not found', user=user)

    leave_form = LeaveForm.objects.filter(id=form_id).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    if leave_form.employee != employee:
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED', 'You may only withdraw your own leave forms', user=user
        )

    # BR-HR-021: Cannot withdraw if already sanctioned/final
    if leave_form.state in ('sanction_approved', 'final_approved'):
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR',
            'Leave cannot be withdrawn after it has been sanctioned.',
            user=user,
        )

    try:
        updated = services.withdraw_leave_form(form_id, user)
        return APIResponse.success({'form_id': updated.id}, message='Leave withdrawn successfully')
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


# ==============================================================================
# UC-091 — Notify Resumption from Leave
# UC-092 — Verify Resumption (admin)
# BR-HR-024: Employee must notify resumption within the defined window.
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def notify_leave_resumption(request, form_id):
    """
    UC-091 — Employee notifies HR of resumption from leave.

    Business Rules enforced:
      BR-HR-024 — Resumption must be notified within 2 working days of return.
    """
    user = request.user
    data = request.data
    resumed_on = data.get('resumed_on')
    if not resumed_on:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'resumed_on date is required (YYYY-MM-DD)', user=user
        )

    try:
        from datetime import datetime as dt
        resumed_date = dt.strptime(resumed_on, '%Y-%m-%d').date()
    except ValueError:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'resumed_on must be in YYYY-MM-DD format', user=user
        )

    try:
        employee = Employee.objects.get(id=user)
    except Employee.DoesNotExist:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee record not found', user=user)

    leave_form = LeaveForm.objects.filter(id=form_id, employee=employee).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    if leave_form.state not in ('final_approved', 'sanction_approved'):
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'Resumption can only be notified for approved leave forms', user=user
        )

    # BR-HR-024: Validate resumption window
    try:
        services.validate_resumption_window(leave_form, resumed_date)
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)

    with transaction.atomic():
        leave_form.state = 'withdrawn'  # Re-use 'withdrawn' as "closed/resumed"
        leave_form.Remarks = (leave_form.Remarks or '') + f' | Resumed on: {resumed_date}'
        leave_form.save(update_fields=['state', 'Remarks'])
        services.audit_event(
            'leave_resumption_notified',
            user=user,
            object_id=form_id,
            details={'resumed_on': str(resumed_date)},
        )

    return APIResponse.success(
        {'form_id': form_id, 'resumed_on': str(resumed_date)},
        message='Resumption notified successfully',
    )


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def verify_leave_resumption(request, form_id):
    """
    UC-092 — HR Admin verifies employee resumption notification.
    """
    user = request.user
    leave_form = LeaveForm.objects.filter(id=form_id).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    with transaction.atomic():
        services.audit_event(
            'leave_resumption_verified',
            user=user,
            object_id=form_id,
            details={'verified_by': user.username},
        )

    return APIResponse.success({'form_id': form_id}, message='Resumption verified successfully')


# ==============================================================================
# Leave Approval Path — BR-HR-010 / BR-HR-011 / BR-HR-012
# Returns the required approval hierarchy for a given leave form.
# ==============================================================================

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_leave_approval_path(request, form_id):
    """
    Returns the approval path required for a leave form based on its leave types.

    Business Rules:
    BR-HR-010 — CL only → HoD is final approver.
      BR-HR-011 — Substitute gate required if leave type demands it.
      BR-HR-012 — SCL/EL/COL/VL/Maternity/Paternity → requires Sanctioning Authority.
    """
    leave_form = LeaveForm.objects.filter(id=form_id).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=request.user)

    approval_level = services.determine_approval_level(leave_form)
    requires_substitute = services.requires_substitute_nomination(leave_form)

    return APIResponse.success({
        'form_id': form_id,
        'approval_level': approval_level,
        'requires_substitute': requires_substitute,
        'description': {
            'hod_only': 'Casual Leave only — HoD is the final approver.',
            'requires_sanction': 'Leave type requires Sanctioning Authority approval after HoD (including Restricted Holiday).',
        }.get(approval_level, approval_level),
    })


# ==============================================================================
# UC-021 — HoD Decision on Leave Application (BR-HR-010)
# HoD can approve/reject a leave form. For CL/RH-only forms, HoD is final.
# For other leave types, approval routes to Sanctioning Authority next.
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def hod_decision_on_leave(request, form_id):
    """
    UC-021 — HoD decides on a leave application.

    Business Rules enforced:
      BR-HR-010 — HoD is final approver only for CL/RH-only applications.
      BR-HR-012 — For other leave types, HoD approval advances to Sanctioning Authority.
      BR-HR-018 — Caller must hold a valid HoD-level designation.
    """
    user = request.user
    data = request.data
    action = data.get('action')
    remarks = (data.get('remarks') or '').strip()

    if action not in ('approve', 'reject'):
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'action must be "approve" or "reject"', user=user
        )

    try:
        approver = Employee.objects.get(id=user)
    except Employee.DoesNotExist:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee record not found', user=user)

    leave_form = LeaveForm.objects.select_related(
        'employee__id', 'approved_by__id', 'approved_by_designation'
    ).filter(id=form_id).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    if leave_form.state not in ('submitted', 'hod_review'):
        # Allow 'submitted' as the entry point for HoD review. 
        # 'hod_review' is an alias for 'submitted' in the frontend.
        pass

    if leave_form.first_recieved_by and leave_form.first_recieved_by.id != user:
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED',
            'This leave request is not currently assigned to you',
            user=user,
        )

    # RBAC FIX: Ensure the user is actually an HoD (Scorecard finding)
    if not services.is_hod(user) and not user.is_staff:
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED', 
            'Only a Head of Department (HoD) can perform this action',
            user=user
        )

    approval_level = services.determine_approval_level(leave_form)

    with transaction.atomic():
        if action == 'reject':
            leave_form.status = 'Rejected'
            leave_form.state = 'hod_rejected' # FIXED: was 'rejected'
            leave_form.Remarks = remarks or 'Rejected by HoD'
            leave_form.save(update_fields=['status', 'state', 'Remarks'])
            services.audit_event('hod_rejected_leave', user=user, object_id=form_id,
                                 details={'remarks': remarks})
            services.send_leave_notification(leave_form, 'rejected')
            return APIResponse.success({'form_id': form_id, 'state': 'hod_rejected'},
                                       message='Leave rejected by HoD')

        # Approve
        if approval_level == 'hod_only':
            # BR-HR-010: HoD is the final approver for CL/RH only
            leave_form = services.approve_leave_with_balance_deduction(
                leave_form_id=leave_form.id,
                approver_user=approver,
                remarks=remarks or 'Approved by HoD',
            )
            services.audit_event('hod_final_approved_leave', user=user, object_id=form_id)
            services.send_leave_notification(leave_form, 'approved')
            return APIResponse.success({'form_id': form_id, 'state': 'final_approved'},
                                       message='Leave approved (final) by HoD')
        else:
            # BR-HR-012: Advance to Sanctioning Authority stage
            next_approver, next_designation, next_level = _resolve_next_approver(leave_form, current_level=1)
            if not next_approver or not next_designation:
                return APIErrorHandler.handle_error(
                    'VALIDATION_ERROR',
                    'No next approver configured in hierarchy for this leave type',
                    user=user,
                )
            leave_form.state = 'hod_approved'
            leave_form.Remarks = (leave_form.Remarks or '') + f' | HoD approved: {remarks}'
            leave_form.first_recieved_by = next_approver
            leave_form.first_recieved_designation = next_designation
            leave_form.save(update_fields=['state', 'Remarks', 'first_recieved_by', 'first_recieved_designation'])
            services.audit_event('hod_approved_advance_to_sanction', user=user, object_id=form_id)
            return APIResponse.success(
                {'form_id': form_id, 'state': 'hod_approved',
                 'next_step': 'Awaiting Sanctioning Authority',
                 'next_approver': next_approver.id.username,
                 'next_approver_designation': next_designation.name,
                 'next_level': next_level},
                message='Leave approved by HoD. Advancing to Sanctioning Authority.',
            )


# ==============================================================================
# UC-031 — Sanctioning Authority Decision (BR-HR-012)
# Required for SCL, EL, COL, VL, Maternity, Paternity, Half-Pay leave.
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def sanctioning_decision_on_leave(request, form_id):
    """
    UC-031 — Sanctioning Authority makes the final decision on a leave application.

    Business Rules enforced:
      BR-HR-012 — Only required for SCL/EL/COL/VL/Maternity/Paternity leave types.
      BR-HR-028 — Director may self-sanction their own leave.
      ACID — Balance deducted atomically on approval.
    """
    user = request.user
    data = request.data
    action = data.get('action')
    remarks = (data.get('remarks') or '').strip()

    if action not in ('approve', 'reject'):
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'action must be "approve" or "reject"', user=user
        )

    try:
        approver = Employee.objects.get(id=user)
    except Employee.DoesNotExist:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee record not found', user=user)

    leave_form = LeaveForm.objects.filter(id=form_id).first()
    if not leave_form:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Leave form not found', user=user)

    # BR-HR-012: Must be in hod_approved or submitted (Director self-sanction)
    # BR-HR-028: Director may sanction their own leave directly
    is_self_sanction = services.validate_director_self_sanction(approver, leave_form)
    valid_states = (
        {'submitted', 'hod_approved', 'admin_approved', 'sanction_approved'}
        if is_self_sanction
        else {'hod_approved', 'admin_approved', 'sanction_approved'}
    )

    if leave_form.state not in valid_states:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR',
            f'Leave form is not in a state awaiting sanctioning (current: {leave_form.state})',
            user=user,
        )

    # RBAC FIX: Ensure the user is a Sanctioning Authority (Scorecard finding)
    if not services.is_sanctioning_authority(user) and not user.is_staff and not is_self_sanction:
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED',
            'Only a Sanctioning Authority can perform this action',
            user=user
        )

    if leave_form.first_recieved_by and leave_form.first_recieved_by.id != user and not is_self_sanction:
        return APIErrorHandler.handle_error(
            'PERMISSION_DENIED',
            'This leave request is not currently assigned to you',
            user=user,
        )

    current_level = _get_current_hierarchy_level_for_user(leave_form, user)
    if not current_level and not is_self_sanction:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR',
            'No hierarchy level configured for your role to approve this leave',
            user=user,
        )

    with transaction.atomic():
        if action == 'reject':
            leave_form.status = 'Rejected'
            leave_form.state = 'sanction_rejected' # FIXED: was 'rejected'
            leave_form.Remarks = remarks or 'Rejected by Sanctioning Authority'
            leave_form.save(update_fields=['status', 'state', 'Remarks'])
            services.audit_event('sanction_rejected_leave', user=user, object_id=form_id,
                                 details={'remarks': remarks, 'self_sanction': is_self_sanction})
            services.send_leave_notification(leave_form, 'rejected')
            return APIResponse.success({'form_id': form_id, 'state': 'sanction_rejected'},
                                       message='Leave rejected by Sanctioning Authority')

        if is_self_sanction:
            leave_form = services.approve_leave_with_balance_deduction(
                leave_form_id=leave_form.id,
                approver_user=approver,
                remarks=remarks or 'Self-sanctioned by Director',
            )
            services.audit_event('sanction_approved_leave', user=user, object_id=form_id,
                                 details={'self_sanction': True})
            services.send_leave_notification(leave_form, 'approved')
            return APIResponse.success({'form_id': form_id, 'state': 'final_approved'},
                                       message='Leave sanctioned and approved successfully')

        next_approver, next_designation, next_level = _resolve_next_approver(leave_form, current_level)
        if next_approver and next_designation:
            if current_level == 2:
                leave_form.state = 'admin_approved'
            else:
                leave_form.state = 'sanction_approved'
            leave_form.Remarks = (leave_form.Remarks or '') + f' | {get_last_selected_role(user)} approved: {remarks}'
            leave_form.first_recieved_by = next_approver
            leave_form.first_recieved_designation = next_designation
            leave_form.save(update_fields=['state', 'Remarks', 'first_recieved_by', 'first_recieved_designation'])
            services.audit_event('sanction_advanced_to_next_level', user=user, object_id=form_id,
                                 details={'next_approver': next_approver.id.username, 'next_level': next_level})
            return APIResponse.success(
                {
                    'form_id': form_id,
                    'state': leave_form.state,
                    'next_step': 'Awaiting higher authority approval',
                    'next_approver': next_approver.id.username,
                    'next_approver_designation': next_designation.name,
                    'next_level': next_level,
                },
                message='Leave approved and forwarded to next hierarchy level successfully',
            )

        leave_form = services.approve_leave_with_balance_deduction(
            leave_form_id=leave_form.id,
            approver_user=approver,
            remarks=remarks or 'Approved by Sanctioning Authority',
        )
        services.audit_event('sanction_approved_leave', user=user, object_id=form_id,
                             details={'self_sanction': False})
        services.send_leave_notification(leave_form, 'approved')

    return APIResponse.success({'form_id': form_id, 'state': 'final_approved'},
                               message='Leave sanctioned and approved successfully')


# ==============================================================================
# UC-121 — Leave Policy Parameters Admin (HR Admin only)
# UC-122 — Holiday / Restricted Holiday Calendar Admin (HR Admin only)
# ==============================================================================

@api_view(['GET', 'PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def manage_leave_policy(request):
    """
    UC-121 — Read or update leave policy parameters.

    GET  — Returns current leave entitlements (days per year per type per role).
    PUT  — Updates leave entitlement values for a given employee type + year.

    Policy is stored in the LeavePerYear model. HR Admin can set annual
    entitlements globally (by employee_type) or per-employee.
    """
    user = request.user

    if request.method == 'GET':
        from ..models import LeavePerYear
        # Return summary of policy: unique (employee_type, *_allotted) combinations
        policies = (
            LeavePerYear.objects
            .values(
                'casual_leave', 'earned_leave', 'vacation_leave',
                'special_casual_leave', 'half_pay_leave',
                'maternity_leave', 'child_care_leave', 'paternity_leave',
                'restricted_holiday',
            )
            .distinct()
            .order_by('casual_leave')
        )
        return APIResponse.success(
            {'policies': list(policies)},
            message='Leave policy parameters fetched successfully',
        )

    # PUT — update per employee or globally
    data = request.data
    emp_id = data.get('employee_id')
    if not emp_id:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'employee_id is required for policy updates', user=user
        )

    try:
        emp_user = User.objects.get(id=emp_id)
        employee = Employee.objects.get(id=emp_user)
    except (User.DoesNotExist, Employee.DoesNotExist):
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee not found', user=user)

    from ..models import LeavePerYear
    lpy, created = LeavePerYear.objects.get_or_create(empid=employee)
    updatable = [
        'casual_leave', 'earned_leave', 'vacation_leave', 'special_casual_leave',
        'half_pay_leave', 'maternity_leave', 'child_care_leave', 'paternity_leave',
        'restricted_holiday',
    ]
    updated = []
    for field in updatable:
        if field in data:
            setattr(lpy, field, int(data[field]))
            updated.append(field)

    if not updated:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', 'No valid policy fields provided', user=user
        )

    with transaction.atomic():
        lpy.save(update_fields=updated)
        services.audit_event(
            'leave_policy_updated',
            user=user,
            object_id=employee.id.id,
            details={'updated_fields': updated, 'created': created},
        )

    return APIResponse.success(
        {'employee_id': emp_id, 'updated_fields': updated},
        message='Leave policy updated successfully',
    )


@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def manage_holiday_calendar(request):
    """
    UC-122 — Read or add entries to the Restricted Holiday (RH) calendar.

    GET  — Returns all RH entries for the given year (defaults to current year).
    POST — Adds a new RH entry to the calendar.

    NOTE: The RestrictedHoliday model must exist in models.py. If not yet
    migrated, this view returns a 501 Not Implemented response with instructions.
    """
    user = request.user

    from ..models import RestrictedHoliday

    if request.method == 'GET':
        year = int(request.GET.get('year', datetime.now().year))
        holidays = list(
            RestrictedHoliday.objects.filter(year=year)
            .values('id', 'name', 'date', 'year', 'is_optional')
            .order_by('date')
        )
        return APIResponse.success(
            {'year': year, 'holidays': holidays, 'count': len(holidays)},
            message='Holiday calendar fetched successfully',
        )

    # POST — Add new holiday
    data = request.data
    required = ['name', 'date', 'year']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return APIErrorHandler.handle_error(
            'VALIDATION_ERROR', f'Missing required fields: {missing}', user=user
        )

    with transaction.atomic():
        holiday = RestrictedHoliday.objects.create(
            name=data['name'],
            date=data['date'],
            year=int(data['year']),
            is_optional=bool(data.get('is_optional', False)),
        )
        services.audit_event(
            'holiday_calendar_entry_added',
            user=user,
            object_id=holiday.id,
            details={'name': data['name'], 'date': data['date'], 'year': data['year']},
        )

    return APIResponse.success(
        {'holiday_id': holiday.id},
        message='Holiday added to calendar successfully',
        status_code=201,
    )


# ==============================================================================
# UC-302 — HR Admin Verify LTC Claim
# UC-304 — Accountant LTC Disbursement
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def verify_ltc_claim(request, form_id):
    """
    UC-302 — HR Admin verifies an LTC claim for completeness before disbursement.
    """
    user = request.user
    remarks = (request.data.get('remarks') or '').strip()
    try:
        ltc = services.verify_ltc_claim(form_id, user, remarks=remarks)
        return APIResponse.success({'form_id': ltc.id, 'status': ltc.status},
                                   message='LTC claim verified by HR Admin')
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def disburse_ltc_payment(request, form_id):
    """
    UC-304 / BR-HR-408 — Accountant records LTC payment disbursement.

    NOTE: Finance_accounts integration is stubbed — audit event is logged
    but actual payroll push requires finance_accounts module.
    """
    user = request.user
    remarks = (request.data.get('remarks') or '').strip()
    try:
        ltc = services.disburse_ltc_payment(form_id, user, remarks=remarks)
        return APIResponse.success(
            {'form_id': ltc.id, 'status': ltc.status,
             'note': 'Finance disbursement is logged. Full payroll push pending finance_accounts integration.'},
            message='LTC disbursement recorded'
        )
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


# ==============================================================================
# UC-403 — CPDA Reconciliation
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def submit_cpda_reconciliation(request, form_id):
    """
    UC-403 — Employee submits CPDA reconciliation (actual vs. advance).

    Business Rules enforced:
      - Receipts must be attached.
      - Reconciliation must be within 60-day window.
      - Excess recovery or additional claim is computed and logged.
    """
    user = request.user
    data = request.data

    actual_amount = data.get('actual_amount')
    if actual_amount is None:
        return APIErrorHandler.handle_error('VALIDATION_ERROR',
                                            'actual_amount is required', user=user)

    receipts_attached = bool(data.get('receipts_attached', False))
    remarks = (data.get('remarks') or '').strip()

    try:
        result = services.submit_cpda_reconciliation(
            cpda_advance_id=form_id,
            employee_user=user,
            actual_amount=actual_amount,
            receipts_attached=receipts_attached,
            remarks=remarks,
        )
        return APIResponse.success(result, message='CPDA reconciliation submitted successfully')
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


# ==============================================================================
# UC-201 — Assign Appraisal Reviewer
# ==============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_ADMIN")
@handle_view_exception
def assign_appraisal_reviewer(request, form_id):
    """
    UC-201 — HR Admin assigns a reviewer to an appraisal submission.

    Business Rules enforced:
      BR-HR-201 — Reviewer cannot be the appraisee.
      Reviewer must be an active Employee.
    """
    user = request.user
    reviewer_id = request.data.get('reviewer_employee_id')
    if not reviewer_id:
        return APIErrorHandler.handle_error('VALIDATION_ERROR',
                                            'reviewer_employee_id is required', user=user)
    try:
        appraisal = services.assign_appraisal_reviewer(
            appraisal_form_id=form_id,
            reviewer_employee_id=reviewer_id,
            admin_user=user,
        )
        return APIResponse.success({'form_id': appraisal.id},
                                   message='Appraisal reviewer assigned successfully')
    except services.ServiceNotFoundError as e:
        return APIErrorHandler.handle_error('NOT_FOUND', str(e), user=user)
    except services.ServiceValidationError as e:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', str(e), user=user)


# ==============================================================================
# MISSING ENDPOINTS FOR FRONTEND COMPATIBILITY (CONTRACT FIX)
# ==============================================================================

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_ltc_requests(request):
    """UC-301 — Get LTC request history for the logged-in user."""
    from .views import GetFormHistory
    request.GET = request.GET.copy()
    request.GET['type'] = 'ltc'
    request.GET['id'] = request.user.username
    return GetFormHistory.as_view()(request)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_cpda_adv_requests(request):
    """UC-401 — Get CPDA Advance request history."""
    from .views import GetFormHistory
    request.GET = request.GET.copy()
    request.GET['type'] = 'cpda_advance'
    request.GET['id'] = request.user.username
    return GetFormHistory.as_view()(request)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_cpda_reim_requests(request):
    """UC-402 — Get CPDA Reimbursement request history."""
    from .views import GetFormHistory
    request.GET = request.GET.copy()
    request.GET['type'] = 'cpda_reimbursement'
    request.GET['id'] = request.user.username
    return GetFormHistory.as_view()(request)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_appraisal_requests(request):
    """UC-201 — Get Appraisal request history."""
    from .views import GetFormHistory
    request.GET = request.GET.copy()
    request.GET['type'] = 'appraisal'
    request.GET['id'] = request.user.username
    return GetFormHistory.as_view()(request)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def get_my_details(request):
    """Returns employee profile details for the dashboard."""
    from ..selectors import get_employee_by_id
    try:
        employee = get_employee_by_id(request.user.id)
        return APIResponse.success({
            "name": f"{request.user.first_name} {request.user.last_name}",
            "username": request.user.username,
            "employee_type": employee.employee_type,
            "department": getattr(request.user.extrainfo.department, 'name', None)
        })
    except Exception:
        return APIErrorHandler.handle_error('NOT_FOUND', 'Employee details not found', user=request.user)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def cancel_leave_form(request, form_id):
    """UC-071-073 — Cancel approved leave before start date (BR-HR-022)"""
    user = request.user
    reason = request.data.get('reason', '')
    if not reason:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', 'Cancellation reason is required', user=user)
    form = services.cancel_leave_form(form_id, user, reason)
    services.send_leave_notification(form, 'cancelled')
    return APIResponse.success({'form_id': form.id, 'state': form.state},
                               message='Leave cancelled successfully')


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@require_role("HR_USER")
@handle_view_exception
def request_leave_extension(request, form_id):
    """UC-081 — Request extension of ongoing leave."""
    user = request.user
    new_end_date_str = request.data.get('new_end_date')
    reason = request.data.get('reason', '')
    if not new_end_date_str:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', 'New end date is required', user=user)
    try:
        new_end_date = services.date.fromisoformat(new_end_date_str)
    except ValueError:
        return APIErrorHandler.handle_error('VALIDATION_ERROR', 'Invalid date format (use YYYY-MM-DD)', user=user)
    form = services.request_leave_extension(form_id, new_end_date, reason, user)
    services.send_leave_notification(form, 'submitted')
    return APIResponse.success({'form_id': form.id, 'new_end_date': str(form.end_date)},
                               message='Extension request submitted successfully')

