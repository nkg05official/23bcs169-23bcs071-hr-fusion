from datetime import date

from rest_framework import serializers
from applications.hr2.models import LTCform, CPDAAdvanceform, CPDAReimbursementform, LeaveForm, Appraisalform, LeaveBalance, Employee
from applications.hr2 import services


class LTC_serializer(serializers.ModelSerializer):
    # Backward-compatible alias for older clients still sending employeeId.
    employeeId = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = LTCform
        fields = (
            'id',
            'employeeId',
            'name',
            'blockYear',
            'pfNo',
            'basicPaySalary',
            'designation',
            'departmentInfo',
            'leaveRequired',
            'leaveStartDate',
            'leaveEndDate',
            'dateOfDepartureForFamily',
            'natureOfLeave',
            'purposeOfLeave',
            'hometownOrNot',
            'placeOfVisit',
            'addressDuringLeave',
            'modeofTravel',
            'detailsOfFamilyMembersAlreadyDone',
            'detailsOfFamilyMembersAboutToAvail',
            'detailsOfDependents',
            'amountOfAdvanceRequired',
            'certifiedThatFamilyDependents',
            'certifiedThatAdvanceTakenOn',
            'adjustedMonth',
            'submissionDate',
            'phoneNumberForContact',
            'approved',
            'approvedDate',
            'created_by',
            'approved_by',
        )

    @staticmethod
    def _parse_block_year_start(block_year_value):
        text = str(block_year_value).strip()
        if not text:
            raise serializers.ValidationError({'blockYear': 'Block year is required'})

        if '-' in text:
            text = text.split('-', 1)[0].strip()

        if not text.isdigit() or len(text) != 4:
            raise serializers.ValidationError({'blockYear': 'Block year must start with a valid 4-digit year'})

        return int(text)

    def validate(self, attrs):
        block_start = self._parse_block_year_start(attrs.get('blockYear'))
        current_year = date.today().year
        current_block_start = current_year - ((current_year - 2000) % 4)

        if block_start != current_block_start:
            raise serializers.ValidationError(
                {'blockYear': f'Not eligible for block year {attrs.get("blockYear")}. Current eligible block starts at {current_block_start}.'}
            )

        block_end = block_start + 3
        leave_start = attrs.get('leaveStartDate')
        leave_end = attrs.get('leaveEndDate')
        if leave_start and leave_end:
            if leave_end < leave_start:
                raise serializers.ValidationError({'leaveEndDate': 'Leave end date cannot be before leave start date'})
            if leave_start.year < block_start or leave_end.year > block_end:
                raise serializers.ValidationError(
                    {'leaveStartDate': f'Travel dates must fall within block period {block_start}-{block_end}'}
                )

        dependents = attrs.get('detailsOfDependents')
        if dependents is not None:
            if not isinstance(dependents, list):
                raise serializers.ValidationError({'detailsOfDependents': 'Dependents must be provided as a list'})
            if len(dependents) > 8:
                raise serializers.ValidationError({'detailsOfDependents': 'Too many dependents for one LTC request'})

            for index, dependent in enumerate(dependents):
                if not isinstance(dependent, dict):
                    raise serializers.ValidationError({'detailsOfDependents': f'Dependent #{index + 1} must be an object'})
                if 'age' not in dependent:
                    raise serializers.ValidationError({'detailsOfDependents': f'Dependent #{index + 1} age is required'})
                try:
                    age = int(dependent.get('age'))
                except (TypeError, ValueError):
                    raise serializers.ValidationError({'detailsOfDependents': f'Dependent #{index + 1} age must be numeric'})
                if age < 0 or age > 100:
                    raise serializers.ValidationError({'detailsOfDependents': f'Dependent #{index + 1} age is invalid'})

        return attrs

    def create(self, validated_data):
        return LTCform.objects.create(**validated_data)


class CPDAAdvance_serializer(serializers.ModelSerializer):
    # Backward-compatible alias for older clients still sending employeeId.
    employeeId = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = CPDAAdvanceform
        fields = (
            'id',
            'employeeId',
            'name',
            'designation',
            'pfNo',
            'purpose',
            'amountRequired',
            'advanceDueAdjustment',
            'submissionDate',
            'balanceAvailable',
            'advanceAmountPDA',
            'amountCheckedInPDA',
            'approved',
            'approvedDate',
            'created_by',
            'approved_by',
        )

    def create(self, validated_data):
        return CPDAAdvanceform.objects.create(**validated_data)

    def validate(self, attrs):
        amount_required = attrs.get("amountRequired")
        if amount_required is None or amount_required <= 0:
            raise serializers.ValidationError({"amountRequired": "Amount required must be greater than zero"})

        balance_available = attrs.get("balanceAvailable")
        if balance_available is not None and amount_required > balance_available:
            raise serializers.ValidationError(
                {"amountRequired": "Requested amount cannot exceed available CPDA balance"}
            )

        return attrs


class Appraisal_serializer(serializers.ModelSerializer):
    # Backward-compatible alias for older clients still sending employeeId.
    employeeId = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Appraisalform
        fields = (
            'id',
            'employeeId',
            'name',
            'designation',
            'disciplineInfo',
            'specificFieldOfKnowledge',
            'currentResearchInterests',
            'coursesTaught',
            'newCoursesIntroduced',
            'newCoursesDeveloped',
            'otherInstructionalTasks',
            'thesisSupervision',
            'sponsoredReseachProjects',
            'otherResearchElement',
            'publication',
            'referredConference',
            'conferenceOrganised',
            'membership',
            'honours',
            'editorOfPublications',
            'expertLectureDelivered',
            'membershipOfBOS',
            'otherExtensionTasks',
            'administrativeAssignment',
            'serviceToInstitute',
            'otherContribution',
            'performanceComments',
            'submissionDate',
            'approved',
            'approvedDate',
            'created_by',
            'approved_by',
        )

    def create(self, validated_data):
        return Appraisalform.objects.create(**validated_data)

    def validate(self, attrs):
        submission_date = attrs.get("submissionDate")
        employee = attrs.get("employee") or (self.instance.employee if self.instance else None)

        if not submission_date:
            raise serializers.ValidationError({"submissionDate": "Submission date is required"})

        if submission_date.month not in (1, 2):
            raise serializers.ValidationError(
                {"submissionDate": "Appraisal submission is allowed only during Jan-Feb window"}
            )

        if employee is not None:
            duplicate_query = Appraisalform.objects.filter(
                employee=employee,
                submissionDate__year=submission_date.year,
            )
            if self.instance:
                duplicate_query = duplicate_query.exclude(pk=self.instance.pk)
            if duplicate_query.exists():
                raise serializers.ValidationError(
                    {"employeeId": "Only one appraisal is allowed per employee per year"}
                )

        return attrs


class CPDAReimbursement_serializer(serializers.ModelSerializer):
    # Backward-compatible alias for older clients still sending employeeId.
    employeeId = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = CPDAReimbursementform
        fields = (
            'id',
            'employeeId',
            'name',
            'designation',
            'pfNo',
            'advanceTaken',
            'purpose',
            'adjustmentSubmitted',
            'balanceAvailable',
            'advanceDueAdjustment',
            'advanceAmountPDA',
            'amountCheckedInPDA',
            'submissionDate',
            'approved',
            'approvedDate',
            'created_by',
            'approved_by',
        )

    def create(self, validated_data):
        return CPDAReimbursementform.objects.create(**validated_data)

    def validate(self, attrs):
        advance_taken = attrs.get("advanceTaken")
        adjustment_submitted = attrs.get("adjustmentSubmitted")

        if adjustment_submitted is not None and adjustment_submitted < 0:
            raise serializers.ValidationError(
                {"adjustmentSubmitted": "Adjustment submitted cannot be negative"}
            )

        if advance_taken is not None and advance_taken < 0:
            raise serializers.ValidationError({"advanceTaken": "Advance taken cannot be negative"})

        if (
            adjustment_submitted is not None
            and advance_taken is not None
            and adjustment_submitted > advance_taken
        ):
            raise serializers.ValidationError(
                {"adjustmentSubmitted": "Reimbursement cannot exceed the taken advance"}
            )

        return attrs


class Leave_serializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveForm
        fields = (
            'id',
            'employee',
            'name',
            'designation',
            'submissionDate',
            'personalfileNo',
            'departmentInfo',
            'leaveStartDate',
            'leaveEndDate',
            'Noof_CasualLeave',
            'Noof_specialCasualLeave',
            'Noof_earnedLeave',
            'Noof_commutedLeave',
            'Noof_restrictedHoliday',
            'Noof_vacationLeave',
            'Noof_maternityLeave',
            'Noof_childCareLeave',
            'Noof_paternityLeave',
            'Noof_halfPayLeave',
            'LeavingStation',
            'StationLeave_startdate',
            'StationLeave_enddate',
            'Address_During_StationLeave',
            'Purpose_of_leave',
            'AcademicResponsibility_user',
            'AcademicResponsibility_designation',
            'AcademicResponsibility_status',
            'AdministrativeResponsibility_user',
            'AdministrativeResponsibility_designation',
            'AdministrativeResponsibility_status',
            'Remarks',
            'approvedDate',
            'approved_by',
            'approved_by_designation',
            'first_recieved_by',
            'first_recieved_designation',
            'status',
            'attached_pdf',
            'attached_pdf_name',
            'file_id',
            'application_type',
            'version',
        )

    def create(self, validated_data):
        return LeaveForm.objects.create(**validated_data)

    def validate(self, attrs):
        leave_start = attrs.get("leaveStartDate") or (self.instance.leaveStartDate if self.instance else None)
        leave_end = attrs.get("leaveEndDate") or (self.instance.leaveEndDate if self.instance else None)
        leaving_station = attrs.get("LeavingStation")
        if leaving_station is None and self.instance:
            leaving_station = self.instance.LeavingStation

        if leave_start and leave_end:
            if leave_end < leave_start:
                raise serializers.ValidationError({"leaveEndDate": "Leave end date cannot be before leave start date"})
            if leave_start < date.today():
                raise serializers.ValidationError({"leaveStartDate": "Leave start date cannot be in the past"})

        if leaving_station:
            station_start = attrs.get("StationLeave_startdate") or (
                self.instance.StationLeave_startdate if self.instance else None
            )
            station_end = attrs.get("StationLeave_enddate") or (
                self.instance.StationLeave_enddate if self.instance else None
            )
            station_address = attrs.get("Address_During_StationLeave") or (
                self.instance.Address_During_StationLeave if self.instance else None
            )
            if not all([station_start, station_end, station_address]):
                raise serializers.ValidationError(
                    {"LeavingStation": "Station leave start/end/address are required when LeavingStation is true"}
                )
            if station_end < station_start:
                raise serializers.ValidationError(
                    {"StationLeave_enddate": "Station leave end date cannot be before station leave start date"}
                )

        if self.instance and "status" in attrs and attrs["status"] != self.instance.status:
            try:
                services.assert_leave_status_transition(self.instance.status, attrs["status"])
            except services.ServiceValidationError as exc:
                raise serializers.ValidationError({"status": str(exc)})

        if self.instance and "version" in attrs:
            submitted_version = attrs.get("version")
            if submitted_version != self.instance.version:
                raise serializers.ValidationError(
                    {
                        "version": (
                            f"Version conflict detected. Current version is {self.instance.version}. "
                            "Refresh data before retrying."
                        )
                    }
                )
            attrs["version"] = self.instance.version + 1

        if attrs.get("status") == "Rejected":
            remarks = (attrs.get("Remarks") or "").strip()
            if len(remarks) < 10:
                raise serializers.ValidationError(
                    {"Remarks": "Rejection remarks must be at least 10 characters long"}
                )

        return attrs


class LeaveBalanace_serializer(serializers.ModelSerializer):
    # Backward-compatible computed fields retained for older clients.
    casual_leave_taken = serializers.SerializerMethodField(read_only=True)
    special_casual_leave_taken = serializers.SerializerMethodField(read_only=True)
    earned_leave_taken = serializers.SerializerMethodField(read_only=True)
    half_pay_leave_taken = serializers.SerializerMethodField(read_only=True)
    maternity_leave_taken = serializers.SerializerMethodField(read_only=True)
    child_care_leave_taken = serializers.SerializerMethodField(read_only=True)
    paternity_leave_taken = serializers.SerializerMethodField(read_only=True)
    leave_encashment_taken = serializers.SerializerMethodField(read_only=True)
    restricted_holiday_taken = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LeaveBalance
        fields = (
            'empid',
            'casual_leave_balance',
            'special_casual_leave_balance',
            'earned_leave_balance',
            'half_pay_leave_balance',
            'maternity_leave_balance',
            'child_care_leave_balance',
            'paternity_leave_balance',
            'leave_encashment_balance',
            'restricted_holiday_balance',
            'casual_leave_taken',
            'special_casual_leave_taken',
            'earned_leave_taken',
            'half_pay_leave_taken',
            'maternity_leave_taken',
            'child_care_leave_taken',
            'paternity_leave_taken',
            'leave_encashment_taken',
            'restricted_holiday_taken',
        )

    def _taken(self, obj, yearly_attr, balance_attr):
        yearly = getattr(obj.empid, 'yearly_leave', None)
        if not yearly:
            return 0
        allotted = int(getattr(yearly, yearly_attr, 0) or 0)
        balance = int(getattr(obj, balance_attr, 0) or 0)
        return max(allotted - balance, 0)

    def get_casual_leave_taken(self, obj):
        return self._taken(obj, 'casual_leave', 'casual_leave_balance')

    def get_special_casual_leave_taken(self, obj):
        return self._taken(obj, 'special_casual_leave', 'special_casual_leave_balance')

    def get_earned_leave_taken(self, obj):
        return self._taken(obj, 'earned_leave', 'earned_leave_balance')

    def get_half_pay_leave_taken(self, obj):
        return self._taken(obj, 'half_pay_leave', 'half_pay_leave_balance')

    def get_maternity_leave_taken(self, obj):
        return self._taken(obj, 'maternity_leave', 'maternity_leave_balance')

    def get_child_care_leave_taken(self, obj):
        return self._taken(obj, 'child_care_leave', 'child_care_leave_balance')

    def get_paternity_leave_taken(self, obj):
        return self._taken(obj, 'paternity_leave', 'paternity_leave_balance')

    def get_leave_encashment_taken(self, obj):
        return self._taken(obj, 'leave_encashment', 'leave_encashment_balance')

    def get_restricted_holiday_taken(self, obj):
        return self._taken(obj, 'restricted_holiday', 'restricted_holiday_balance')

    def create(self, validated_data):
        return LeaveBalance.objects.create(**validated_data)


# class Deignations(serializers.ModelSerializer):
#     class Meta:
#         model = Deignations
#         fields = '__all__'

#     def create(self,validated_data):
#         return
