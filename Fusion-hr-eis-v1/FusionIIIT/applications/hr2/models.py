from django.db import models
from applications.globals.models import ExtraInfo, Designation
# from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import User
from datetime import date
from  applications.filetracking.models import File

class Constants:
    # Class for various choices on the enumerations
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    DEPARTMENT = (
        ('CSE', 'CSE'),
        ('ME', 'Mechanical'),
        ('ECE', 'ECE'),
        ('DESIGN', 'DESIGN'),
    )
    CATEGORY = (
        ('SC', 'SC'),
        ('ST', 'ST'),
        ('OBC', 'OBC'),
        ('GENERAL', 'GENERAL'),
        ('PWD', 'PWD'),

    )
    MARITIAL_STATUS = (
        ('MARRIED', 'MARRIED'),
        ('UN-MARRIED', 'UN-MARRIED'),
        ('WIDOW', 'WIDOW'),

    )

    BLOOD_GROUP = (
        ('AB+', 'AB+'),
        ('O+', 'O+'),
        ('AB-', 'AB-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('O-', 'O-'),
        ('A+', 'A+'),
        ('A-', 'A-'),

    )
    FOREIGN_SERVICE = (
        ('LIEN', 'LIEN'),
        ('DEPUTATION', 'DEPUTATION'),
        ('OTHER', 'OTHER'),
    )










# Employee Table
class Employee(models.Model):
    id = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_details', primary_key=True)
    father_name = models.CharField(max_length=100)
    mother_name = models.CharField(max_length=100)
    
    religion = models.CharField(max_length=20, null=True, blank=True)
    CATEGORY_CHOICES = [
        ('General', 'General'),
        ('OBC', 'OBC'),
        ('SC', 'SC'),
        ('ST', 'ST'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    caste = models.CharField(max_length=50)
    home_state = models.CharField(max_length=50)
    home_district = models.CharField(max_length=50)
    full_address = models.TextField()
    date_of_joining = models.DateField()
    date_of_birth = models.DateField()
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
    ]
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES)
    phone_number = models.CharField(max_length=15)
    personal_email = models.EmailField()
    emergency_contact_number = models.CharField(max_length=15)
    emergency_contact_name = models.CharField(max_length=100)
    Employee_Type = [
        ('Faculty', 'Faculty'),
        ('Staff', 'Staff'),
        ('Other', 'Other'),
    ]
    employee_type = models.CharField(max_length=10, choices=Employee_Type,default='Faculty') 

    def __str__(self):
        return f"{self.id.username} - Employee Details"












# Employee Confidential Table
class EmpConfidentialDetails(models.Model):
    id = models.AutoField(primary_key=True)
    empid = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='confidential_details')
    aadhar_number = models.CharField(max_length=12, unique=True)
    pan_number = models.CharField(max_length=10, unique=True)
    MARITAL_STATUS_CHOICES = [
        ('Single', 'Single'),
        ('Married', 'Married'),
        ('Divorced', 'Divorced'),
        ('Widowed', 'Widowed'),
    ]
    marital_status = models.CharField(max_length=10, choices=MARITAL_STATUS_CHOICES)
    personal_file_number = models.CharField(max_length=50, unique=True)
    bank_account_number = models.CharField(max_length=20, unique=True)
    ifsc_code = models.CharField(max_length=20,null=True)
    basic_pay = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Confidential Details of {self.empid.empid.username}"












# Employee Dependents Table
class EmpDependents(models.Model):
    id = models.AutoField(primary_key=True)
    empid = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='dependents')
    name = models.CharField(max_length=100)
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    relation = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=15)
    contact_email = models.EmailField(null=True, blank=True)
    date_of_birth = models.DateField()

    def __str__(self):
        return f"Dependent {self.name} of {self.empid.empid.username}"











class ForeignService(models.Model):
    """
    This table contains details about deputation, lien 
    and other foreign services of employee
    """
    extra_info = models.ForeignKey(ExtraInfo, on_delete=models.CASCADE)
    start_date = models.DateField(max_length=6, null=True, blank=True)
    end_date = models.DateField(max_length=6, null=True, blank=True)
    job_title = models.CharField(max_length=50, default='')
    organisation = models.CharField(max_length=100, default='')
    description = models.CharField(max_length=300, default='')
    salary_source = models.CharField(max_length=100, default='')
    designation = models.CharField(max_length=100, default='')
    # award_name = models.CharField(max_length=100, default='')
    # award_type = models.CharField(max_length=100, default='')
    # achievement_date = models.CharField(max_length=100, default='')
    service_type = models.CharField(
        max_length=100, choices=Constants.FOREIGN_SERVICE)

    def __str__(self):
        return self.extra_info.user.first_name


class EmpAppraisalForm(models.Model):
    extra_info = models.ForeignKey(ExtraInfo, on_delete=models.CASCADE)
    year = models.DateField(max_length=6, null=True, blank=True)
    appraisal_form = models.FileField(
        upload_to='Hr2/appraisal_form', null=True, default=" ")

    def __str__(self):
        return self.extra_info.user.first_name


class WorkAssignemnt(models.Model):
    extra_info = models.ForeignKey(ExtraInfo, on_delete=models.CASCADE)
    start_date = models.DateField(max_length=6, null=True, blank=True)
    end_date = models.DateField(max_length=6, null=True, blank=True)
    job_title = models.CharField(max_length=50, default='')
    orders_copy = models.FileField(blank=True, null=True)

class LTCform(models.Model):
    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='ltc_claims', db_index=True)  # Nullable for existing records
    name = models.CharField(max_length=100, null=True)
    blockYear = models.TextField() #
    pfNo = models.IntegerField()
    basicPaySalary = models.IntegerField(null=True)
    designation = models.CharField(max_length=50)
    departmentInfo = models.CharField(max_length=50)
    leaveRequired = models.BooleanField(default=False,null=True) #
    leaveStartDate = models.DateField(null=True, blank=True, db_index=True)  # BR-003: Index for range queries
    leaveEndDate = models.DateField(null=True, blank=True, db_index=True)
    dateOfDepartureForFamily = models.DateField(null=True, blank=True) #
    natureOfLeave = models.TextField(null=True,blank=True)
    purposeOfLeave = models.TextField(null=True,blank=True)
    hometownOrNot = models.BooleanField(default=False)
    placeOfVisit = models.TextField(max_length=100, null=True, blank=True) 
    addressDuringLeave = models.TextField(null=True)
    modeofTravel = models.TextField(max_length=10, null=True,blank=True) #
    detailsOfFamilyMembersAlreadyDone = models.JSONField(null=True,blank=True)
    detailsOfFamilyMembersAboutToAvail = models.JSONField(max_length=100, null=True,blank=True) 
    detailsOfDependents = models.JSONField(blank=True,null=True) 
    amountOfAdvanceRequired = models.IntegerField(null=True, blank=True)
    certifiedThatFamilyDependents = models.BooleanField(blank=True,null=True) 
    certifiedThatAdvanceTakenOn = models.DateField(null=True, blank=True) 
    adjustedMonth = models.TextField(max_length=50, null=True,blank=True)
    submissionDate = models.DateField(null=True)
    phoneNumberForContact = models.BigIntegerField()
    approved = models.BooleanField(null=True)
    status = models.CharField(max_length=20, default='Pending', db_index=True) # Added to fix service logic
    approvedDate = models.DateField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='LTC_created_by', db_index=True)
    approved_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='LTC_approved_by', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    Remarks = models.TextField(null=True, blank=True) # Added to fix service logic
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(leaveEndDate__gte=models.F('leaveStartDate')) | models.Q(leaveStartDate__isnull=True),
                name='ltc_leave_end_after_start'
            ),
        ]
        indexes = [
            models.Index(fields=['employee', 'blockYear']),
            models.Index(fields=['created_by', 'created_at']),
        ]



class CPDAAdvanceform(models.Model):
    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='cpda_advances', db_index=True)  # Nullable for existing records
    name = models.CharField(max_length=40,null=True)
    designation = models.CharField(max_length=40,null=True)
    pfNo = models.IntegerField(null=True)
    purpose = models.TextField(max_length=40, null=True)
    amountRequired = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    advanceDueAdjustment = models.DecimalField(max_digits=10, decimal_places=2, null=True,blank=True)
   
    submissionDate = models.DateField(blank=True, null=True)
   
    balanceAvailable = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    advanceAmountPDA = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    amountCheckedInPDA = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
   
    approved = models.BooleanField(null=True)
    status = models.CharField(max_length=20, default='Pending', db_index=True)
    approvedDate = models.DateField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='CPDA_created_by', db_index=True)
    approved_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True,blank=True, related_name='CPDA_approved_by', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    Remarks = models.TextField(null=True, blank=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(amountRequired__gte=0) | models.Q(amountRequired__isnull=True),
                name='cpda_amount_positive'
            ),
        ]
        indexes = [
            models.Index(fields=['employee', 'approved']),
            models.Index(fields=['created_by', 'created_at']),
        ]



class LeaveStatusChoices(models.TextChoices):
    ACCEPTED = 'Accepted', 'Accepted'
    PENDING = 'Pending', 'Pending'
    REJECTED = 'Rejected', 'Rejected'


class LeaveApplicationTypeChoices(models.TextChoices):
    ONLINE = 'Online', 'Online'
    OFFLINE = 'Offline', 'Offline'



 # Leave Application Table - FIXED: Added state machine and database indexes
class LeaveForm(models.Model):
    
    # STATE MACHINE CHOICES (replaces multiple boolean fields)
    STATE_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted - Awaiting HoD'),
        ('hod_approved', 'HoD Approved - Awaiting Dean'),
        ('hod_rejected', 'HoD Rejected'),
        ('dean_approved', 'Dean Approved - Awaiting Registrar'),
        ('dean_rejected', 'Dean Rejected'),
        ('registrar_approved', 'Registrar Approved - Awaiting Director'),
        ('registrar_rejected', 'Registrar Rejected'),
        ('sanction_approved', 'Director Approved'),
        ('sanction_rejected', 'Director Rejected'),
        ('final_approved', 'Final Approved - Balance Deducted'),
        ('cancelled', 'Cancelled'),
        ('withdrawn', 'Withdrawn'),
    ]

    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_applications')
    name = models.CharField(max_length=40, null=True)
    designation = models.CharField(max_length=40, null=True)
    submissionDate = models.DateField(default=date.today, db_index=True)
    personalfileNo = models.CharField(max_length=50, null=True)
    departmentInfo = models.CharField(max_length=40, null=True)
    
    leaveStartDate = models.DateField(blank=True, null=True, db_index=True)
    leaveEndDate = models.DateField(blank=True, null=True, db_index=True)
    
    # Leave types requested
    Noof_CasualLeave = models.IntegerField(default=0)
    Noof_specialCasualLeave = models.IntegerField(default=0)
    Noof_earnedLeave = models.IntegerField(default=0)
    Noof_commutedLeave = models.IntegerField(default=0)
    Noof_restrictedHoliday = models.IntegerField(default=0)
    Noof_vacationLeave = models.IntegerField(default=0)
    Noof_maternityLeave = models.IntegerField(default=0)
    Noof_childCareLeave = models.IntegerField(default=0)
    Noof_paternityLeave = models.IntegerField(default=0)
    Noof_halfPayLeave = models.IntegerField(default=0)
    
    # Half-Day Support (BR-HR-025)
    is_half_day = models.BooleanField(default=False)
    HALF_DAY_SLOTS = [
        ('AM', 'Morning Slot (Before 2:00 PM)'),
        ('PM', 'Afternoon Slot (After 2:00 PM)'),
    ]
    half_day_slot = models.CharField(max_length=2, choices=HALF_DAY_SLOTS, null=True, blank=True)
    
    LeavingStation = models.BooleanField(default=False)
    StationLeave_startdate = models.DateField(blank=True, null=True)
    StationLeave_enddate = models.DateField(blank=True, null=True)
    Address_During_StationLeave = models.TextField(null=True, blank=True)
    Purpose_of_leave = models.TextField(null=True, blank=True)
    
    # Responsibility handlers
    AcademicResponsibility_user = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='academic_responsibility_user'
    )
    AcademicResponsibility_designation = models.ForeignKey(
        Designation, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_academic_responsibility_designation'
    )
    AcademicResponsibility_status = models.CharField(
        max_length=10, 
        choices=LeaveStatusChoices.choices, 
        default=LeaveStatusChoices.PENDING
    )
    
    AdministrativeResponsibility_user = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='administrative_responsibility_user'
    )
    AdministrativeResponsibility_designation = models.ForeignKey(
        Designation, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_administrative_responsibility_designation'
    )
    AdministrativeResponsibility_status = models.CharField(
        max_length=10, 
        choices=LeaveStatusChoices.choices, 
        default=LeaveStatusChoices.PENDING
    )
    
    # State machine (replaces old status fields)
    state = models.CharField(
        max_length=50, 
        choices=STATE_CHOICES, 
        default='draft',
        db_index=True
    )
    
    # Financial tracking (BR-002)
    balance_deducted = models.BooleanField(default=False)  # Has balance been deducted?
    balance_deduction_date = models.DateTimeField(null=True, blank=True)
    
    # Approval tracking
    Remarks = models.TextField(null=True, blank=True)
    approvedDate = models.DateField(auto_now_add=True, null=True)
    approved_by = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_approved_by'
    )
    approved_by_designation = models.ForeignKey(
        Designation, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_approved_by_designation'
    )
    
    first_recieved_by = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_first_recieved_by'
    )
    first_recieved_designation = models.ForeignKey(
        Designation, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_first_recieved_designation'
    )

    # Legacy status field (for backward compatibility, deprecated)
    status = models.CharField(
        max_length=10, 
        choices=LeaveStatusChoices.choices, 
        default=LeaveStatusChoices.PENDING
    )
    
    attached_pdf = models.BinaryField(null=True, blank=True)
    attached_pdf_name = models.CharField(max_length=100, null=True, blank=True)
    file_id = models.IntegerField(null=True, blank=True)
    application_type = models.CharField(
        max_length=10, 
        choices=LeaveApplicationTypeChoices.choices, 
        default=LeaveApplicationTypeChoices.ONLINE,
        db_index=True
    )
    
    # Version tracking (for optimistic locking - prevents race conditions)
    version = models.IntegerField(default=1)

    def clean(self):
        """Model-level validation for cross-field integrity (BR-HR-004, BR-HR-023)"""
        from django.core.exceptions import ValidationError
        
        # 1. Date Range Validation
        if self.leaveStartDate and self.leaveEndDate:
            if self.leaveStartDate > self.leaveEndDate:
                raise ValidationError({'leaveEndDate': "End date cannot be before start date"})
        
        # 2. Station Leave Validation (BR-HR-004)
        if self.LeavingStation:
            if not self.Address_During_StationLeave:
                raise ValidationError({'Address_During_StationLeave': "Address is required for station leave"})
            if not self.StationLeave_StartDate or not self.StationLeave_EndDate:
                raise ValidationError("Station leave dates are required")
        
        super().clean()

    def save(self, *args, **kwargs):
        """Ensure status and state stay synchronized during saves (Integrity Fix)"""
        if self.state in ('final_approved', 'sanction_approved'):
            self.status = 'Accepted'
        elif 'rejected' in self.state or self.state == 'withdrawn' or self.state == 'cancelled':
            self.status = 'Rejected'
        else:
            self.status = 'Pending'
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            # Prevent overlapping leaves (BR-003)
            # DB-level guard: no two active leave records for the same employee
            # can share the same start date.  The application layer checks date
            # ranges; this constraint closes the race-condition gap.
            models.UniqueConstraint(
                fields=['employee', 'leaveStartDate'],
                condition=models.Q(state__in=[
                    'submitted', 'hod_approved', 'admin_approved',
                    'sanction_approved', 'final_approved',
                ]),
                name='unique_active_leave_start_per_employee',
            ),

            # Ensure station leave has address (BR-004)
            models.CheckConstraint(
                check=(
                    models.Q(LeavingStation=False) |
                    models.Q(Address_During_StationLeave__isnull=False, Address_During_StationLeave__gt='')
                ),
                name='station_leave_requires_address'
            ),
        ]
        indexes = [
            models.Index(fields=['employee', 'state']),
            models.Index(fields=['employee', 'leaveStartDate', 'leaveEndDate']),
            models.Index(fields=['state', 'submissionDate']),
            models.Index(fields=['approved_by', 'state']),
            models.Index(fields=['balance_deducted', 'state']),
        ]
        verbose_name = "Leave Form"
        verbose_name_plural = "Leave Forms"
    
    def get_total_days_requested(self):
        """Calculate total leave days requested"""
        return sum([
            self.Noof_CasualLeave,
            self.Noof_specialCasualLeave,
            self.Noof_earnedLeave,
            self.Noof_commutedLeave,
            self.Noof_restrictedHoliday,
            self.Noof_vacationLeave,
            self.Noof_maternityLeave,
            self.Noof_childCareLeave,
            self.Noof_paternityLeave,
            self.Noof_halfPayLeave,
        ])
    
    def __str__(self):
        return f"Leave Application {self.id} - {self.employee.id.username} ({self.state})"

class LeaveClaim(models.Model):
    id = models.AutoField(primary_key=True)
    leave_form = models.ForeignKey(LeaveForm, on_delete=models.CASCADE, related_name='leave_claims')
    claim_date=models.DateField(default=date.today)
    
    leaveStartDate = models.DateField(blank=True, null=True)
    leaveEndDate = models.DateField(blank=True, null=True)
    
    # Leave fields
    Noof_CasualLeave = models.IntegerField(default=0)
    Noof_specialCasualLeave = models.IntegerField(default=0)
    Noof_earnedLeave = models.IntegerField(default=0)
    Noof_commutedLeave = models.IntegerField(default=0)
    Noof_restrictedHoliday = models.IntegerField(default=0)
    Noof_vacationLeave = models.IntegerField(default=0)
    Noof_maternityLeave = models.IntegerField(default=0)
    Noof_childCareLeave = models.IntegerField(default=0)
    Noof_paternityLeave = models.IntegerField(default=0)
    Noof_halfPayLeave = models.IntegerField(default=0)
    
    remarks = models.TextField(null=True, blank=True)
    
    approvedDate = models.DateField(auto_now_add=True, null=True)
    approved_by = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_claim_approved_by'
    )
    approved_by_designation = models.ForeignKey(
        Designation, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='leave_claim_approved_by_designation'
    )
    
    status = models.CharField(max_length=10, choices=LeaveStatusChoices.choices, default=LeaveStatusChoices.PENDING)
    attached_pdf = models.BinaryField(null=True, blank=True)
    attached_pdf_name = models.CharField(max_length=100, null=True, blank=True)
    file_id = models.IntegerField(null=True, blank=True)
    
    application_type = models.CharField(
        max_length=10, 
        choices=LeaveApplicationTypeChoices.choices,
        default=LeaveApplicationTypeChoices.ONLINE
    )

    def __str__(self):
        return f"Leave Claim {self.id} for Form {self.leave_form.id}"

    class Meta:
        verbose_name = "Leave Claim"
        verbose_name_plural = "Leave Claims"











# Leave Balance Table - FIXED: Added constraints to prevent negative balances (BR-002)
class LeaveBalance(models.Model):
    empid = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='leave_balance', primary_key=True)
    
    # Current year balance tracking (cannot go negative - BR-002, BR-003)
    casual_leave_balance = models.IntegerField(default=8, help_text="Available casual leave (cannot be negative)")
    special_casual_leave_balance = models.IntegerField(default=15)
    earned_leave_balance = models.IntegerField(default=15)
    half_pay_leave_balance = models.IntegerField(default=15)
    maternity_leave_balance = models.IntegerField(default=180)
    child_care_leave_balance = models.IntegerField(default=730)
    paternity_leave_balance = models.IntegerField(default=15)
    vacation_leave_balance = models.IntegerField(default=60) # Added
    leave_encashment_balance = models.IntegerField(default=60)
    restricted_holiday_balance = models.IntegerField(default=2)
    
    # Carryover balance (from previous year - BR-002)
    casual_leave_carryover = models.IntegerField(default=0)
    earned_leave_carryover = models.IntegerField(default=0)
    
    # Totals (for quick reference)
    total_casual_leave = models.IntegerField(default=0)  # balance + carryover
    total_earned_leave = models.IntegerField(default=0)
    
    # Financial year tracking (for carryover rules)
    financial_year = models.CharField(max_length=10, default='2025-26')  # e.g., "2025-26"
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            # Prevent negative balances (BR-002)
            models.CheckConstraint(
                check=models.Q(casual_leave_balance__gte=0),
                name='casual_leave_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(earned_leave_balance__gte=0),
                name='earned_leave_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(half_pay_leave_balance__gte=0),
                name='half_pay_leave_non_negative'
            ),
        ]
        indexes = [
            models.Index(fields=['financial_year']),
            models.Index(fields=['empid', 'financial_year']),
        ]
    
    def get_available_leave(self, leave_type):
        """Get available balance for a leave type"""
        if leave_type == 'casual':
            return self.casual_leave_balance + self.casual_leave_carryover
        elif leave_type == 'earned':
            return self.earned_leave_balance + self.earned_leave_carryover
        elif leave_type == 'maternity':
            return self.maternity_leave_balance
        elif leave_type == 'paternity':
            return self.paternity_leave_balance
        return 0
    
    def can_deduct_leave(self, leave_type, days):
        """Check if balance sufficient (BR-002)"""
        available = self.get_available_leave(leave_type)
        return available >= days

    def __str__(self):
        return f"Leave Balance for {self.empid.id.username} (FY: {self.financial_year})"


class LeavePerYear(models.Model):
    empid = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='yearly_leave', primary_key=True)
    casual_leave = models.IntegerField(default=8)
    special_casual_leave = models.IntegerField(default=15)
    earned_leave = models.IntegerField(default=15)
    half_pay_leave = models.IntegerField(default=15)
    maternity_leave = models.IntegerField(default=180)
    child_care_leave = models.IntegerField(default=730)
    paternity_leave = models.IntegerField(default=15)
    vacation_leave = models.IntegerField(default=60) # Added
    leave_encashment = models.IntegerField(default=60)
    restricted_holiday = models.IntegerField(default=2)

    def __str__(self):
        return f"Yearly Leave Allotment for {self.empid.empid.username}"







class Appraisalform(models.Model):
    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='appraisals', db_index=True)  # Nullable for existing records
    name = models.CharField(max_length=22)
    designation = models.CharField(max_length=50)
    disciplineInfo = models.CharField(max_length=22, null=True)
    specificFieldOfKnowledge = models.TextField(max_length=40, null=True)
    currentResearchInterests = models.TextField(max_length=40, null=True)
    coursesTaught = models.JSONField(max_length=100, null=True)
    newCoursesIntroduced = models.JSONField(max_length=100, null=True)
    newCoursesDeveloped = models.JSONField(max_length=100, null=True)
    otherInstructionalTasks = models.TextField(max_length=100, null=True)
    thesisSupervision = models.JSONField(max_length=100, null=True)
    sponsoredReseachProjects = models.JSONField(max_length=100, null=True)
    otherResearchElement = models.TextField(max_length=40, null=True)
    publication = models.TextField(max_length=40, null=True)
    referredConference = models.TextField(max_length=40, null=True)
    conferenceOrganised = models.TextField(max_length=40, null=True)
    membership = models.TextField(max_length=40, null=True)
    honours = models.TextField(max_length=40, null=True)
    editorOfPublications = models.TextField(max_length=40, null=True)
    expertLectureDelivered = models.TextField(max_length=40, null=True)
    membershipOfBOS = models.TextField(max_length=40, null=True)
    otherExtensionTasks = models.TextField(max_length=40, null=True)
    administrativeAssignment = models.TextField(max_length=40, null=True)
    serviceToInstitute = models.TextField(max_length=40, null=True)
    otherContribution = models.TextField(max_length=40, null=True)
    performanceComments = models.TextField(max_length=100, null=True)
    submissionDate = models.DateField(max_length=6, null=True)

    approved = models.BooleanField(null=True)
    status = models.CharField(max_length=20, default='Pending', db_index=True)
    approvedDate = models.DateField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='Appraisal_created_by', db_index=True)
    approved_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='Appraisal_approved_by', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    Remarks = models.TextField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'approved']),
            models.Index(fields=['created_by', 'created_at']),
        ]


class CPDAReimbursementform(models.Model):
     id = models.AutoField(primary_key=True)
     employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='cpda_reimbursements', db_index=True)  # Nullable for existing records
     name = models.CharField(max_length=50)
     designation = models.CharField(max_length=50)
     pfNo = models.IntegerField()
     advanceTaken = models.IntegerField()
     purpose = models.TextField()
     adjustmentSubmitted = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
     balanceAvailable = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
     advanceDueAdjustment = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
     advanceAmountPDA = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
     amountCheckedInPDA = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    #  submissionDate = models.DateField(auto_now_add=True)
     submissionDate = models.DateField(blank=True, null=True)
     approved = models.BooleanField(null=True)
     status = models.CharField(max_length=20, default='Pending', db_index=True)
     approvedDate = models.DateField(auto_now_add=True, null=True)
     created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='CPDAR_created_by', db_index=True)
     approved_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='CPDAR_approved_by', db_index=True)
     created_at = models.DateTimeField(auto_now_add=True, null=True)
     updated_at = models.DateTimeField(auto_now=True, null=True)
     Remarks = models.TextField(null=True, blank=True)
     
     class Meta:
         indexes = [
             models.Index(fields=['employee', 'approved']),
             models.Index(fields=['created_by', 'created_at']),
         ]


# =======================
# SUBSTITUTE WORKFLOW MODELS (UC-004, UC-005)
# =======================

class SubstituteRequest(models.Model):
    """
    Manages substitute nomination and acceptance workflow (BR-005, UC-004, UC-005)
    """
    SUBSTITUTE_STATUS_CHOICES = [
        ('pending', 'Pending - Awaiting Substitute Response'),
        ('accepted', 'Accepted - Substitute Confirmed'),
        ('rejected', 'Rejected - Substitute Declined'),
        ('cancelled', 'Cancelled - By Employee or System'),
    ]
    
    id = models.AutoField(primary_key=True)
    leave_form = models.ForeignKey(LeaveForm, on_delete=models.CASCADE, related_name='substitute_requests')
    
    # Employee requesting leave
    requesting_employee = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name='substitute_requests_sent'
    )
    
    # Nominated substitute (must cover responsibilities)
    substitute_employee = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='substitute_requests_received'
    )
    
    # Request details
    request_date = models.DateTimeField(auto_now_add=True)
    reason_for_substitution = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=SUBSTITUTE_STATUS_CHOICES, 
        default='pending'
    )
    
    # Response tracking
    response_date = models.DateTimeField(null=True, blank=True)
    response_remarks = models.TextField(null=True, blank=True)
    
    # Audit trail
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='substitute_requests_created'
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['leave_form', 'substitute_employee'],
                name='unique_substitute_per_leave'
            )
        ]
        indexes = [
            models.Index(fields=['status', 'leave_form']),
            models.Index(fields=['substitute_employee', 'status']),
        ]
    
    def __str__(self):
        return f"Substitute Request - {self.requesting_employee} (Status: {self.status})"


# =======================
# APPROVAL HIERARCHY MODELS
# =======================

class ApprovalHierarchy(models.Model):
    """
    Defines approval chains for different leave types and form types (BR-010, BR-012, BR-018)
    """
    APPROVAL_LEVEL_CHOICES = [
        (1, 'Department Head (HoD)'),
        (2, 'Administrative Handler'),
        (3, 'Sanctioning Authority (Director/Principal)'),
        (4, 'Finance/Accounts'),
        (5, 'HR Final Approval'),
    ]
    
    FORM_TYPE_CHOICES = [
        ('leave', 'Leave Application'),
        ('ltc', 'LTC Claim'),
        ('cpda_advance', 'CPDA Advance'),
        ('cpda_reimbursement', 'CPDA Reimbursement'),
        ('appraisal', 'Appraisal'),
    ]
    
    id = models.AutoField(primary_key=True)
    form_type = models.CharField(max_length=50, choices=FORM_TYPE_CHOICES)
    leave_type = models.CharField(max_length=50, null=True, blank=True)  # For leave-specific rules
    department = models.ForeignKey(
        'globals.DepartmentInfo',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # Approval step configuration
    approval_level = models.IntegerField(choices=APPROVAL_LEVEL_CHOICES)
    required_designation = models.ForeignKey(
        Designation,
        on_delete=models.CASCADE,
        related_name='approval_hierarchies'
    )
    
    # Financial thresholds
    min_amount_limit = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Minimum amount for this level to approve"
    )
    max_amount_limit = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Maximum amount for this level to approve"
    )
    
    # SLA Configuration
    sla_days = models.IntegerField(default=5, help_text="Days allowed for approval")
    can_reject = models.BooleanField(default=True)
    can_forward = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = [
            ['form_type', 'leave_type', 'approval_level', 'department']
        ]
        indexes = [
            models.Index(fields=['form_type', 'approval_level']),
            models.Index(fields=['required_designation', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.form_type} - Level {self.approval_level}: {self.required_designation}"


class LeaveFormApprovalStep(models.Model):
    """
    Tracks approval progress through hierarchy (BR-010, BR-018, BR-019)
    """
    STEP_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('forwarded', 'Forwarded'),
        ('escalated', 'Escalated - SLA Breach'),
    ]
    
    id = models.AutoField(primary_key=True)
    leave_form = models.ForeignKey(LeaveForm, on_delete=models.CASCADE, related_name='approval_steps')
    approval_hierarchy = models.ForeignKey(ApprovalHierarchy, on_delete=models.SET_NULL, null=True)
    
    # Step tracking
    step_number = models.IntegerField()  # 1, 2, 3, etc.
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='leave_approvals_assigned'
    )
    
    # Timeline
    assigned_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    response_date = models.DateTimeField(null=True, blank=True)
    
    # Response
    status = models.CharField(
        max_length=20,
        choices=STEP_STATUS_CHOICES,
        default='pending'
    )
    remarks = models.TextField(null=True, blank=True)
    
    # Escalation tracking
    escalation_count = models.IntegerField(default=0)
    last_escalation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = [['leave_form', 'step_number']]
        indexes = [
            models.Index(fields=['leave_form', 'step_number']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['due_date', 'status']),
        ]
    
    def __str__(self):
        return f"Approval Step {self.step_number} for Leave {self.leave_form.id} - {self.status}"


# =======================
# LOGGING AND AUDIT MODELS
# =======================

class ErrorLog(models.Model):
    """
    Structured error logging for debugging and monitoring (Error Handling)
    """
    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    id = models.AutoField(primary_key=True)
    error_code = models.CharField(max_length=50, db_index=True)  # e.g., 'INSUFFICIENT_BALANCE'
    error_message = models.TextField()
    error_type = models.CharField(max_length=100)  # Exception class name
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='MEDIUM')
    
    # Context
    module = models.CharField(max_length=50)  # e.g., 'hr2.views'
    function = models.CharField(max_length=100)
    line_number = models.IntegerField(null=True, blank=True)
    
    # Request context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    request_path = models.CharField(max_length=500, null=True, blank=True)
    request_method = models.CharField(max_length=10, null=True, blank=True)
    
    # Related objects
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True)
    leave_form = models.ForeignKey(LeaveForm, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Stack trace
    stack_trace = models.TextField(null=True, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['error_code', 'severity']),
            models.Index(fields=['timestamp', 'resolved']),
            models.Index(fields=['user', 'timestamp']),
        ]
        verbose_name_plural = "Error Logs"
    
    def __str__(self):
        return f"[{self.severity}] {self.error_code} - {self.timestamp}"


class LeaveFormAuditLog(models.Model):
    """
    Comprehensive audit trail for leave operations (BR-406)
    """
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('balance_deduction', 'Balance Deduction'),
        ('substitute_request', 'Substitute Request'),
        ('substitute_response', 'Substitute Response'),
    ]
    
    id = models.AutoField(primary_key=True)
    leave_form = models.ForeignKey(LeaveForm, on_delete=models.CASCADE, related_name='audit_logs')
    
    # Action tracking
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Details
    old_values = models.JSONField(null=True, blank=True)  # Previous state
    new_values = models.JSONField(null=True, blank=True)  # New state
    remarks = models.TextField(null=True, blank=True)
    
    # System info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['leave_form', 'timestamp']),
            models.Index(fields=['performed_by', 'action']),
            models.Index(fields=['timestamp', 'action']),
        ]
        verbose_name_plural = "Leave Form Audit Logs"
    
    def __str__(self):
        return f"{self.action.upper()} by {self.performed_by} on {self.leave_form.id}"



