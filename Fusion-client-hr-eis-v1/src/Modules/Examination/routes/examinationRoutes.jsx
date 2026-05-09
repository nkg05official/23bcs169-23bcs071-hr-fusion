import { host } from "../../../routes/globalRoutes";

export const exam_view = `${host}/examination/api/exam_view/`; 
export const download_template = `${host}/examination/api/download_template/`; //done
export const get_courses = `${host}/examination/api/submitGrades/`; //done
export const upload_grades = `${host}/examination/api/upload_grades/`; //done
export const update_grades = `${host}/examination/api/update_grades/`; // done
export const update_enter_grades = `${host}/examination/api/update_enter_grades/`;//done 
export const moderate_student_grades = `${host}/examination/api/moderate_student_grades/`; //done
export const generate_transcript = `${host}/examination/api/generate_transcript/`; //done
export const generate_transcript_form = `${host}/examination/api/generate_transcript_form/`; //done
export const generate_result = `${host}/examination/api/generate_result/`;  //done
export const submit = `${host}/examination/api/submit/`; 
export const download_excel = `${host}/examination/api/download_excel/`;
export const submitGradesProf = `${host}/examination/api/submitGradesProf/`; //done
export const upload_grades_prof = `${host}/examination/api/upload_grades_prof/`;  //done
export const verify_grades_dean = `${host}/examination/api/verify_grades_dean/`;  //done
export const update_enter_grades_dean = `${host}/examination/api/update_enter_grades_dean/`; //done  (some extra rendering error)
export const validate_dean = `${host}/examination/api/validate_dean/`;  //done
export const validate_dean_submit = `${host}/examination/api/validate_dean_submit/`;  //done
// export const downloadGrades = `${host}/examination/api/downloadGrades/`;  
export const check_result = `${host}/examination/api/check_result/`; 
export const get_courses_prof = `${host}/examination/api/downloadGrades/`;
export const download_grades = `${host}/examination/api/generate_student_result_pdf/`;
export const download_grades_prof = `${host}/examination/api/generate_pdf/`;
export const preview_grades = `${host}/examination/api/preview_grades/`;
export const announce_result = `${host}/examination/api/result-announcements/`;
export const update_result_announcement = `${host}/examination/api/update-announcement/`;
export const create_announcemet = `${host}/examination/api/create-announcement/`;
export const get_course_reg_academic_years = `${host}/examination/api/unique-course-reg-years/`
export const get_student_grades_academic_years = `${host}/examination/api/unique-stu-grades-years/`

export const get_result_semesters = `${host}/examination/api/student/result_semesters/`;
export const grade_status = `${host}/examination/api/grade_status/`;
export const grade_summary = `${host}/examination/api/grade_summary/`;