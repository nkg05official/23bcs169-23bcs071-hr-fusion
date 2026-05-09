import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.apps import apps
from django.db import connection

cursor = connection.cursor()

app_models = list(apps.get_app_config('hr2').get_models())

all_missing = {}

for model in app_models:
    table_name = model._meta.db_table
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")
    existing_cols = {r[0].lower() for r in cursor.fetchall()}
    
    if not existing_cols:
        continue # Table might not exist at all, skip for now
        
    model_cols = [f.column for f in model._meta.local_fields]
    missing_cols = [c for c in model_cols if c.lower() not in existing_cols]
    
    if missing_cols:
        all_missing[table_name] = missing_cols
        
print("=== Missing Columns ===")
for table, cols in all_missing.items():
    print(f"{table}: {cols}")
    
# Let's generate SQL for missing columns (basic assumption, might need tweaking)
print("\n=== SQL to add columns ===")
for table, cols in all_missing.items():
    model = [m for m in app_models if m._meta.db_table == table][0]
    for col in cols:
        field = [f for f in model._meta.local_fields if f.column == col][0]
        db_type = field.db_type(connection)
        if db_type:
            # Simple hack for default values to allow adding NOT NULL columns to existing tables
            default_clause = ""
            if not field.null:
                if 'boolean' in db_type.lower():
                    default_clause = " DEFAULT FALSE"
                elif 'int' in db_type.lower() or 'numeric' in db_type.lower():
                    default_clause = " DEFAULT 0"
                elif 'char' in db_type.lower() or 'text' in db_type.lower():
                    default_clause = " DEFAULT ''"
                elif 'date' in db_type.lower():
                    default_clause = " DEFAULT CURRENT_TIMESTAMP"
            print(f'ALTER TABLE {table} ADD COLUMN "{col}" {db_type}{" NULL" if field.null else " NOT NULL"}{default_clause};')
