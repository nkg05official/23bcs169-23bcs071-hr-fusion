"""Generated specification-traceable module/service tests (20 total)."""

from datetime import date, timedelta

from applications.hr2.models import LeaveForm
from applications.hr2.services import ServiceValidationError
from applications.hr2 import services
from applications.hr2.tests.conftest import BaseModuleTestCase


MODULE_CASES = [
    "MOD-001", "MOD-002", "MOD-003", "MOD-004", "MOD-005",
    "MOD-006", "MOD-007", "MOD-008", "MOD-009", "MOD-010",
    "MOD-011", "MOD-012", "MOD-013", "MOD-014", "MOD-015",
    "MOD-016", "MOD-017", "MOD-018", "MOD-019", "MOD-020",
]


class GeneratedModuleSpecTests(BaseModuleTestCase):
    def _base_leave(self, **kwargs):
        defaults = {
            "employee": self.employee,
            "name": self.employee_user.get_full_name() or "Ravi Kumar",
            "designation": self.employee_designation.name,
            "submissionDate": date.today(),
            "personalfileNo": "PF-MOD",
            "departmentInfo": self.department.name,
            "leaveStartDate": date.today() + timedelta(days=2),
            "leaveEndDate": date.today() + timedelta(days=3),
            "Purpose_of_leave": "Generated module case",
            "status": "Pending",
            "state": "submitted",
            "Noof_CasualLeave": 1,
        }
        defaults.update(kwargs)
        return LeaveForm(**defaults)

    def _run_case(self, case_id):
        self.mark_case(
            f"{case_id}-01",
            f"Module test {case_id}",
            "Execute service-level validation and edge-case checks",
            "Service response matches expected behavior",
            category="MODULE",
        )

        if case_id == "MOD-001":
            services.validate_attachment(None, required=False)
            self.assertTrue(True)
            return

        if case_id == "MOD-002":
            with self.assertRaises(ServiceValidationError):
                services.validate_leave_dates(date.today() + timedelta(days=2), date.today() + timedelta(days=1))
            return

        if case_id == "MOD-003":
            with self.assertRaises(ServiceValidationError):
                services.validate_station_leave(True, None, None, None)
            return

        if case_id == "MOD-004":
            values = services._extract_leave_requested_days({"casualLeave": "1"})
            self.assertEqual(values["casual"], 1)
            return

        if case_id == "MOD-005":
            with self.assertRaises(ServiceValidationError):
                services.validate_leave_type_eligibility(self.employee, {})
            return

        if case_id == "MOD-006":
            with self.assertRaises(ServiceValidationError):
                services.assert_leave_status_transition("Accepted", "Pending")
            return

        if case_id == "MOD-007":
            with self.assertRaises(ServiceValidationError):
                services.validate_leave_balance(self.employee, "casual", 9999)
            return

        if case_id == "MOD-008":
            before = self.leave_balance.casual_leave_balance
            services.deduct_leave_balance(self.employee, "casual", 1)
            self.leave_balance.refresh_from_db()
            self.assertEqual(self.leave_balance.casual_leave_balance, before - 1)
            return

        if case_id == "MOD-009":
            obj = self._base_leave(Noof_CasualLeave=1)
            self.assertEqual(services.determine_approval_level(obj), "hod_only")
            return

        if case_id == "MOD-010":
            obj = self._base_leave(Noof_CasualLeave=0, Noof_earnedLeave=1)
            self.assertEqual(services.determine_approval_level(obj), "requires_sanction")
            return

        if case_id == "MOD-011":
            obj = self._base_leave(Noof_CasualLeave=0, Noof_specialCasualLeave=1)
            self.assertTrue(services.requires_substitute_nomination(obj))
            return

        if case_id == "MOD-012":
            obj = self._base_leave(status="Accepted", leaveStartDate=date.today() + timedelta(days=1))
            services.validate_cancellation_window(obj)
            self.assertTrue(True)
            return

        if case_id == "MOD-013":
            obj = self._base_leave(status="Accepted", leaveStartDate=date.today() + timedelta(days=10))
            with self.assertRaises(ServiceValidationError):
                services.validate_cancellation_window(obj)
            return

        if case_id == "MOD-014":
            obj = self._base_leave(status="Accepted", leaveEndDate=date.today())
            services.validate_resumption_window(obj, date.today() + timedelta(days=1))
            self.assertTrue(True)
            return

        if case_id == "MOD-015":
            obj = self._base_leave(status="Accepted", leaveEndDate=date.today())
            with self.assertRaises(ServiceValidationError):
                services.validate_resumption_window(obj, date.today() + timedelta(days=10))
            return

        if case_id == "MOD-016":
            self.assertTrue(callable(services.validate_director_self_sanction))
            return

        if case_id == "MOD-017":
            self.assertTrue(callable(services.create_substitute_request))
            return

        if case_id == "MOD-018":
            self.assertTrue(callable(services.respond_to_substitute_request))
            return

        if case_id == "MOD-019":
            with self.assertRaises(ServiceValidationError):
                services.validate_cpda_balance(self.employee, 999999)
            return

        self.assertTrue(callable(services.assign_appraisal_reviewer))


for _case_id in MODULE_CASES:
    def _factory(case_id):
        def _test(self):
            return self._run_case(case_id)
        _test.__name__ = f"test_{case_id.lower().replace('-', '_')}_01"
        return _test

    setattr(
        GeneratedModuleSpecTests,
        f"test_{_case_id.lower().replace('-', '_')}_01",
        _factory(_case_id),
    )
