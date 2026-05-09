import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.db import connection

cursor = connection.cursor()

sql_statements = [
    'ALTER TABLE hr2_ltcform ADD COLUMN "employee_id" integer NULL;',
    'ALTER TABLE hr2_ltcform ADD COLUMN "created_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_ltcform ADD COLUMN "updated_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_cpdaadvanceform ADD COLUMN "employee_id" integer NULL;',
    'ALTER TABLE hr2_cpdaadvanceform ADD COLUMN "created_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_cpdaadvanceform ADD COLUMN "updated_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_leaveform ADD COLUMN "balance_deducted" boolean NOT NULL DEFAULT FALSE;',
    'ALTER TABLE hr2_leaveform ADD COLUMN "balance_deduction_date" timestamp with time zone NULL;',
    'ALTER TABLE hr2_leaveform ADD COLUMN "version" integer NOT NULL DEFAULT 0;',
    'ALTER TABLE hr2_appraisalform ADD COLUMN "employee_id" integer NULL;',
    'ALTER TABLE hr2_appraisalform ADD COLUMN "created_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_appraisalform ADD COLUMN "updated_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_cpdareimbursementform ADD COLUMN "employee_id" integer NULL;',
    'ALTER TABLE hr2_cpdareimbursementform ADD COLUMN "created_at" timestamp with time zone NULL;',
    'ALTER TABLE hr2_cpdareimbursementform ADD COLUMN "updated_at" timestamp with time zone NULL;',
]

for sql in sql_statements:
    try:
        cursor.execute(sql)
        print(f"OK: {sql}")
    except Exception as e:
        if 'already exists' in str(e):
            print(f"SKIP (exists): {sql}")
        else:
            print(f"ERROR: {e} - {sql}")

# We should also fake any pending migrations just in case
print("Done adding missing columns!")
