import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.db import connection

cursor = connection.cursor()

# Check which columns from migration 0007 are missing
tables_to_check = {
    'hr2_leaveform': ['is_half_day', 'half_day_slot'],
    'hr2_leavebalance': ['vacation_leave_balance'],
    'hr2_leaveperyear': ['vacation_leave'],
    'hr2_appraisalform': ['Remarks', 'status'],
    'hr2_cpdaadvanceform': ['Remarks', 'status'],
    'hr2_cpdareimbursementform': ['Remarks', 'status'],
    'hr2_ltcform': ['Remarks', 'status'],
}

all_missing = {}
for table, needed_cols in tables_to_check.items():
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
    existing = {r[0] for r in cursor.fetchall()}
    missing = [c for c in needed_cols if c.lower() not in {x.lower() for x in existing}]
    if missing:
        all_missing[table] = missing
    print(f"{table}: existing={len(existing)} cols, missing={missing}")

print(f"\n=== Summary: Tables with missing columns ===")
for table, cols in all_missing.items():
    print(f"  {table}: {cols}")

if not all_missing:
    print("  All columns exist! Safe to fake the migration.")
