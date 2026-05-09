DO $$
DECLARE
    v_user_id INTEGER := 3371;
    v_desig_id_hr INTEGER;
    v_desig_id_admin INTEGER;
    v_desig_id_faculty INTEGER;
BEGIN
    -- Ensure designations exist
    INSERT INTO globals_designation (name, full_name, type) VALUES ('hr', 'Human Resources', 'administrative') ON CONFLICT (name) DO NOTHING;
    INSERT INTO globals_designation (name, full_name, type) VALUES ('admin', 'System Administrator', 'administrative') ON CONFLICT (name) DO NOTHING;
    INSERT INTO globals_designation (name, full_name, type) VALUES ('faculty', 'Faculty', 'academic') ON CONFLICT (name) DO NOTHING;

    -- Get their IDs
    SELECT id INTO v_desig_id_hr FROM globals_designation WHERE name = 'hr';
    SELECT id INTO v_desig_id_admin FROM globals_designation WHERE name = 'admin';
    SELECT id INTO v_desig_id_faculty FROM globals_designation WHERE name = 'faculty';
    
    -- Ensure ModuleAccess exists
    INSERT INTO globals_moduleaccess (designation, hr, program_and_curriculum, course_registration, course_management, other_academics, spacs, department, database, examinations, iwd, complaint_management, fts, purchase_and_store, rspc, hostel_management, mess_management, gymkhana, placement_cell, visitor_hostel, phc)
    VALUES ('hr', true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false) ON CONFLICT DO NOTHING;
    
    INSERT INTO globals_moduleaccess (designation, hr, program_and_curriculum, course_registration, course_management, other_academics, spacs, department, database, examinations, iwd, complaint_management, fts, purchase_and_store, rspc, hostel_management, mess_management, gymkhana, placement_cell, visitor_hostel, phc)
    VALUES ('admin', true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true) ON CONFLICT DO NOTHING;
    
    INSERT INTO globals_moduleaccess (designation, hr, program_and_curriculum, course_registration, course_management, other_academics, spacs, department, database, examinations, iwd, complaint_management, fts, purchase_and_store, rspc, hostel_management, mess_management, gymkhana, placement_cell, visitor_hostel, phc)
    VALUES ('faculty', true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false) ON CONFLICT DO NOTHING;
    
    -- Update existing module accesses to ensure hr = true
    UPDATE globals_moduleaccess SET hr = true WHERE designation IN ('hr', 'admin', 'faculty');

    -- Assign to user
    INSERT INTO globals_holdsdesignation (user_id, working_id, designation_id, held_at) VALUES (v_user_id, v_user_id, v_desig_id_hr, NOW()) ON CONFLICT (user_id, designation_id) DO NOTHING;
    INSERT INTO globals_holdsdesignation (user_id, working_id, designation_id, held_at) VALUES (v_user_id, v_user_id, v_desig_id_admin, NOW()) ON CONFLICT (user_id, designation_id) DO NOTHING;
    INSERT INTO globals_holdsdesignation (user_id, working_id, designation_id, held_at) VALUES (v_user_id, v_user_id, v_desig_id_faculty, NOW()) ON CONFLICT (user_id, designation_id) DO NOTHING;

    -- Update active role
    UPDATE globals_extrainfo SET last_selected_role = 'hr' WHERE user_id = v_user_id;
END $$;
