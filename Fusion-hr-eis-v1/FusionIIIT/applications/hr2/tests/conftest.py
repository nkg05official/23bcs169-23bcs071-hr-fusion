"""
hr2 test fixtures and shared helpers.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from applications.globals.models import Designation, DepartmentInfo, ExtraInfo, HoldsDesignation
from applications.hr2.models import Employee, LeaveBalance, LeaveForm


User = get_user_model()


class BaseModuleTestCase(TestCase):
	@classmethod
	def setUpTestData(cls):
		cls.department = DepartmentInfo.objects.create(name="CSE")
		cls.employee_designation = Designation.objects.create(
			name="faculty",
			full_name="Faculty",
			type="academic",
		)
		cls.supervisor_designation = Designation.objects.create(
			name="supervisor",
			full_name="Supervisor",
			type="academic",
		)
		cls.hr_designation = Designation.objects.create(
			name="hr_admin",
			full_name="HR Admin",
			type="administrative",
		)

		cls.employee_user = User.objects.create_user(
			username="hr2_employee",
			password="testpass123",
			first_name="Ravi",
			last_name="Kumar",
		)
		cls.supervisor_user = User.objects.create_user(
			username="hr2_supervisor",
			password="testpass123",
			first_name="Asha",
			last_name="Verma",
		)
		cls.hr_user = User.objects.create_user(
			username="hr2_admin",
			password="testpass123",
			first_name="Meera",
			last_name="Singh",
		)

		cls.employee_extra = ExtraInfo.objects.create(
			id="EI-HR2-EMP",
			user=cls.employee_user,
			user_type="faculty",
			department=cls.department,
			last_selected_role=cls.employee_designation.name,
		)
		cls.supervisor_extra = ExtraInfo.objects.create(
			id="EI-HR2-SUP",
			user=cls.supervisor_user,
			user_type="faculty",
			department=cls.department,
			last_selected_role=cls.supervisor_designation.name,
		)
		cls.hr_extra = ExtraInfo.objects.create(
			id="EI-HR2-HR",
			user=cls.hr_user,
			user_type="staff",
			department=cls.department,
			last_selected_role=cls.hr_designation.name,
		)

		cls.employee = Employee.objects.create(
			id=cls.employee_user,
			father_name="Father",
			mother_name="Mother",
			category="General",
			caste="General",
			home_state="State",
			home_district="District",
			full_address="123 Campus Road",
			date_of_joining=date(2020, 1, 1),
			date_of_birth=date(1990, 1, 1),
			blood_group="A+",
			phone_number="9999999999",
			personal_email="emp@example.com",
			emergency_contact_number="8888888888",
			emergency_contact_name="Parent",
			employee_type="Faculty",
		)
		cls.supervisor_employee = Employee.objects.create(
			id=cls.supervisor_user,
			father_name="Father",
			mother_name="Mother",
			category="General",
			caste="General",
			home_state="State",
			home_district="District",
			full_address="456 Admin Road",
			date_of_joining=date(2019, 1, 1),
			date_of_birth=date(1985, 1, 1),
			blood_group="B+",
			phone_number="7777777777",
			personal_email="sup@example.com",
			emergency_contact_number="6666666666",
			emergency_contact_name="Parent",
			employee_type="Faculty",
		)
		cls.hr_employee = Employee.objects.create(
			id=cls.hr_user,
			father_name="Father",
			mother_name="Mother",
			category="General",
			caste="General",
			home_state="State",
			home_district="District",
			full_address="789 HR Road",
			date_of_joining=date(2018, 1, 1),
			date_of_birth=date(1983, 1, 1),
			blood_group="O+",
			phone_number="5555555555",
			personal_email="hr@example.com",
			emergency_contact_number="4444444444",
			emergency_contact_name="Parent",
			employee_type="Faculty",
		)

		HoldsDesignation.objects.create(
			user=cls.supervisor_user,
			working=cls.supervisor_user,
			designation=cls.supervisor_designation,
		)
		HoldsDesignation.objects.create(
			user=cls.hr_user,
			working=cls.hr_user,
			designation=cls.hr_designation,
		)

		cls.leave_balance = LeaveBalance.objects.create(empid=cls.employee)
		LeaveBalance.objects.create(empid=cls.supervisor_employee)
		LeaveBalance.objects.create(empid=cls.hr_employee)

	def mark_case(self, test_id, scenario, input_action, expected_result, *, uc_id="", br_id="", wf_id="", category=""):
		self._test_id = test_id
		self._scenario = scenario
		self._input_action = input_action
		self._expected_result = expected_result
		self._uc_id = uc_id
		self._br_id = br_id
		self._wf_id = wf_id
		self._test_category = category
		self._results = []
		self._steps = []

	@staticmethod
	def authenticated_anonymous_user():
		return AnonymousUser()
