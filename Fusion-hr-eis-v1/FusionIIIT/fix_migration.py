import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.db import connection

cursor = connection.cursor()

# Add all missing columns from migration 0007
sql_statements = [
    # hr2_leaveform
    'ALTER TABLE hr2_leaveform ADD COLUMN is_half_day BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE hr2_leaveform ADD COLUMN half_day_slot VARCHAR(2) NULL',
    
    # hr2_appraisalform
    'ALTER TABLE hr2_appraisalform ADD COLUMN "Remarks" TEXT NULL',
    "ALTER TABLE hr2_appraisalform ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'",
    
    # hr2_cpdaadvanceform
    'ALTER TABLE hr2_cpdaadvanceform ADD COLUMN "Remarks" TEXT NULL',
    "ALTER TABLE hr2_cpdaadvanceform ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'",
    
    # hr2_cpdareimbursementform
    'ALTER TABLE hr2_cpdareimbursementform ADD COLUMN "Remarks" TEXT NULL',
    "ALTER TABLE hr2_cpdareimbursementform ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'",
    
    # hr2_ltcform
    'ALTER TABLE hr2_ltcform ADD COLUMN "Remarks" TEXT NULL',
    "ALTER TABLE hr2_ltcform ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'",
]

for sql in sql_statements:
    try:
        cursor.execute(sql)
        print(f"OK: {sql[:70]}...")
    except Exception as e:
        err_msg = str(e)
        if 'already exists' in err_msg:
            print(f"SKIP (already exists): {sql[:70]}...")
        else:
            print(f"ERROR: {err_msg} -- {sql[:70]}...")

# Also add the unique constraint if it doesn't exist
try:
    cursor.execute("""
        ALTER TABLE hr2_leaveform ADD CONSTRAINT unique_active_leave_start_per_employee
        UNIQUE (employee_id, "leaveStartDate")
    """)
    print("OK: Added unique constraint")
except Exception as e:
    if 'already exists' in str(e):
        print("SKIP: Unique constraint already exists")
    else:
        # Partial unique constraint needs a different approach in raw SQL
        print(f"Note: Constraint may need Django migration: {e}")

print("\nDone adding missing columns!")
