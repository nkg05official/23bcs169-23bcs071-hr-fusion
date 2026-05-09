import { host } from "../globalRoutes";

export const viewcourses = `${host}/api/ocms/{user}/`;
export const course = `${host}/api/ocms/{course_code}/`;
export const uploadAssignment = `${host}/api/ocms//{course_code}/upload_assignment`;
export const addDocument = `${host}/api/ocms/{course_code}/add_document`;
export const addAssignment = `${host}/api/ocms/{course_code}/add_assignment`;
export const submitAttendance = `${host}/api/ocms/{course_code}/submit_attendance`;
export const viewAttendance = `${host}/api/ocms/{course_code}/view_attendance`;
export const updateGrade = `${host}/api/ocms/{course_code}/update_grade`;

// above path of the api is incorrect follow below path as /ocms/api/...
export const createGradingScheme = `${host}/ocms/api/upload-grading-scheme/`;
export const getAttendance = `${host}/ocms/api/get-attendance/`;
export const uploadAttendance = `${host}/ocms/api/upload-attendance/`;
