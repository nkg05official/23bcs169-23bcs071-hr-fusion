"""
Django management command to initialize approval hierarchies
Run: python manage.py shell < setup_approval_hierarchies.py

This script sets up the initial ApprovalHierarchy records for all forms
"""

from django.db import transaction
from applications.hr2.models import ApprovalHierarchy
from applications.globals.models import Designation, DepartmentInfo

@transaction.atomic
def setup_approval_hierarchies():
    """Initialize ApprovalHierarchy records for all form types and departments"""
    
    print("Setting up Approval Hierarchies...")
    
    # Clear existing records (optional - for reset)
    # ApprovalHierarchy.objects.all().delete()
    
    # Get or create designations
    try:
        hod_designation = Designation.objects.get(name__icontains='HOD')
    except:
        print("WARNING: HOD designation not found")
        return False
    
    try:
        admin_designation = Designation.objects.get(name__icontains='admin')
    except:
        print("WARNING: Admin designation not found")
        return False
    
    try:
        sanction_designation = Designation.objects.get(name__icontains='director')
    except:
        print("WARNING: Director/Sanctioning Authority designation not found")
        return False
    
    try:
        finance_designation = Designation.objects.get(name__icontains='finance')
    except:
        print("WARNING: Finance designation not found")
        return False
    
    try:
        hr_designation = Designation.objects.get(name__icontains='hr')
    except:
        print("WARNING: HR designation not found")
        return False
    
    # Get all departments
    departments = DepartmentInfo.objects.all()
    
    if not departments.exists():
        print("WARNING: No departments found")
        return False
    
    # Define approval hierarchies for each form type
    hierarchies = [
        # LEAVE FORMS - 5 levels
        {
            'form_type': 'leave',
            'leave_type': None,
            'approval_level': 1,
            'required_designation': hod_designation,
            'sla_days': 3,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'leave',
            'leave_type': None,
            'approval_level': 2,
            'required_designation': admin_designation,
            'sla_days': 3,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'leave',
            'leave_type': None,
            'approval_level': 3,
            'required_designation': sanction_designation,
            'sla_days': 5,
            'min_amount_limit': 0,
            'max_amount_limit': None,
            'can_reject': True,
            'can_forward': False,
        },
        {
            'form_type': 'leave',
            'leave_type': None,
            'approval_level': 5,
            'required_designation': hr_designation,
            'sla_days': 2,
            'can_reject': False,
            'can_forward': False,
        },
        # LTC FORMS
        {
            'form_type': 'ltc',
            'leave_type': None,
            'approval_level': 1,
            'required_designation': hod_designation,
            'sla_days': 5,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'ltc',
            'leave_type': None,
            'approval_level': 2,
            'required_designation': finance_designation,
            'sla_days': 7,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'ltc',
            'leave_type': None,
            'approval_level': 3,
            'required_designation': sanction_designation,
            'sla_days': 5,
            'can_reject': True,
            'can_forward': False,
        },
        # CPDA ADVANCE FORMS
        {
            'form_type': 'cpda_advance',
            'leave_type': None,
            'approval_level': 1,
            'required_designation': hod_designation,
            'sla_days': 3,
            'min_amount_limit': 0,
            'max_amount_limit': 100000,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'cpda_advance',
            'leave_type': None,
            'approval_level': 2,
            'required_designation': finance_designation,
            'sla_days': 5,
            'min_amount_limit': 100000,
            'max_amount_limit': None,
            'can_reject': True,
            'can_forward': False,
        },
        # CPDA REIMBURSEMENT FORMS
        {
            'form_type': 'cpda_reimbursement',
            'leave_type': None,
            'approval_level': 1,
            'required_designation': hod_designation,
            'sla_days': 5,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'cpda_reimbursement',
            'leave_type': None,
            'approval_level': 2,
            'required_designation': finance_designation,
            'sla_days': 7,
            'can_reject': True,
            'can_forward': False,
        },
        # APPRAISAL FORMS
        {
            'form_type': 'appraisal',
            'leave_type': None,
            'approval_level': 1,
            'required_designation': hod_designation,
            'sla_days': 7,
            'can_reject': True,
            'can_forward': True,
        },
        {
            'form_type': 'appraisal',
            'leave_type': None,
            'approval_level': 2,
            'required_designation': hr_designation,
            'sla_days': 7,
            'can_reject': True,
            'can_forward': False,
        },
    ]
    
    # Create hierarchies for each department
    created_count = 0
    for hierarchy_config in hierarchies:
        for department in departments:
            try:
                # Check if already exists
                existing = ApprovalHierarchy.objects.filter(
                    form_type=hierarchy_config['form_type'],
                    leave_type=hierarchy_config['leave_type'],
                    approval_level=hierarchy_config['approval_level'],
                    department=department,
                ).exists()
                
                if not existing:
                    ApprovalHierarchy.objects.create(
                        form_type=hierarchy_config['form_type'],
                        leave_type=hierarchy_config['leave_type'],
                        department=department,
                        approval_level=hierarchy_config['approval_level'],
                        required_designation=hierarchy_config['required_designation'],
                        min_amount_limit=hierarchy_config.get('min_amount_limit'),
                        max_amount_limit=hierarchy_config.get('max_amount_limit'),
                        sla_days=hierarchy_config['sla_days'],
                        can_reject=hierarchy_config['can_reject'],
                        can_forward=hierarchy_config['can_forward'],
                        is_active=True,
                    )
                    created_count += 1
            except Exception as e:
                print(f"Error creating hierarchy for {hierarchy_config['form_type']} - {department}: {str(e)}")
    
    print(f"✅ Created {created_count} approval hierarchy records")
    return True


@transaction.atomic
def migrate_leave_balance_data():
    """Migrate existing LeaveBalance records to new schema"""
    from applications.hr2.models import LeaveBalance
    from datetime import datetime
    
    print("Migrating LeaveBalance data...")
    
    balances = LeaveBalance.objects.all()
    
    for balance in balances:
        # Map old fields to new fields
        # Old: casual_leave_taken → New: casual_leave_balance (available)
        # For migration, we assume taken = used, so balance = entitlement - taken
        
        # Initialize with defaults if not already set
        if not hasattr(balance, 'financial_year'):
            balance.financial_year = '2025-26'
        
        # Set balance = entitlement (from LeavePerYear)
        yearly = balance.empid.yearly_leave
        balance.casual_leave_balance = yearly.casual_leave
        balance.earned_leave_balance = yearly.earned_leave
        balance.half_pay_leave_balance = yearly.half_pay_leave
        balance.maternity_leave_balance = yearly.maternity_leave
        balance.child_care_leave_balance = yearly.child_care_leave
        balance.paternity_leave_balance = yearly.paternity_leave
        balance.restricted_holiday_balance = yearly.restricted_holiday
        balance.special_casual_leave_balance = yearly.special_casual_leave
        
        balance.save()
    
    print(f"✅ Migrated {balances.count()} leave balance records")
    return True


if __name__ == '__main__':
    print("\n" + "="*60)
    print("FUSION HR2 - APPROVAL HIERARCHY SETUP")
    print("="*60 + "\n")
    
    success = setup_approval_hierarchies()
    
    if success:
        print("\n" + "-"*60)
        print("Attempting to migrate LeaveBalance data...")
        print("-"*60)
        migrate_leave_balance_data()
    
    print("\n" + "="*60)
    print("SETUP COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Review ApprovalHierarchy records in admin panel")
    print("2. Run tests to verify atomic operations")
    print("3. Deploy to staging for UAT")
    print("4. Monitor error logs in production")
