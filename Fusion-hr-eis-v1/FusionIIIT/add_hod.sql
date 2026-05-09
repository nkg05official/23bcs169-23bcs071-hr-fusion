DO $$
DECLARE
    v_user_id INTEGER := 3371;
    v_desig_id_hod INTEGER;
BEGIN
    INSERT INTO globals_designation (name, full_name, type) VALUES ('HOD (CSE)', 'Head of Department CSE', 'academic') ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_desig_id_hod FROM globals_designation WHERE name = 'HOD (CSE)';
    
    INSERT INTO globals_moduleaccess (designation, hr) VALUES ('HOD (CSE)', true) ON CONFLICT DO NOTHING;
    UPDATE globals_moduleaccess SET hr = true WHERE designation = 'HOD (CSE)';
    
    INSERT INTO globals_holdsdesignation (user_id, working_id, designation_id, held_at) VALUES (v_user_id, v_user_id, v_desig_id_hod, NOW()) ON CONFLICT (user_id, designation_id) DO NOTHING;
END $$;
