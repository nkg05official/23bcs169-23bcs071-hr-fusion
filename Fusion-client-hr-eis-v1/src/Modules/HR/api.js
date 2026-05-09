import { host } from "../../routes/globalRoutes";

export const get_form_initials = `${host}/hr2/api/v1/legacy/get_form_initials`;
export const get_employee_initials = `${host}/hr2/api/v1/legacy/get_employee_initials`;
export const search_employees = `${host}/hr2/api/v1/legacy/search_employees`;
export const offline_leave_form = `${host}/hr2/api/v1/legacy/offline_leave_form`;
export const get_form_track = (formId) =>
  `${host}/hr2/api/v1/legacy/get_track_file/${formId}`;

export const admin_get_all_leave_balances = `${host}/hr2/api/v1/legacy/admin_get_all_leave_balances`;
export const admin_get_leave_requests = `${host}/hr2/api/v1/legacy/admin_get_leave_requests`;

export const get_leave_balance = `${host}/hr2/api/v1/legacy/get_leave_balance`;
export const submit_leave_form = `${host}/hr2/api/v1/legacy/submit_leave_form`;
export const get_leave_form_by_id = `${host}/hr2/api/v1/legacy/get_leave_form_by_id`;
export const handle_leave_academic_responsibility = `${host}/hr2/api/v1/legacy/handle_leave_academic_responsibility`;
export const handle_leave_administrative_responsibility = `${host}/hr2/api/v1/legacy/handle_leave_administrative_responsibility`;
export const download_leave_form_pdf = `${host}/hr2/api/v1/legacy/download_leave_form_pdf`;
export const get_leave_inbox = `${host}/hr2/api/v1/legacy/get_leave_inbox`;
export const handle_leave_file = `${host}/hr2/api/v1/legacy/handle_leave_file`;
export const hod_decision_on_leave = `${host}/hr2/api/v1/legacy/hod_decision_on_leave`;
export const sanctioning_decision_on_leave = `${host}/hr2/api/v1/legacy/sanctioning_decision_on_leave`;

export const search_employee = `${host}/hr2/api/search_employee`;
export const get_my_details = `${host}/hr2/api/get_my_details`;
export const get_form_id = `${host}/hr2/api/get_form_id`;
export const get_leave_requests = `${host}/hr2/api/v1/legacy/get_leave_requests`;
export const get_leave_archive = `${host}/hr2/api/get_leave_archive`;
export const view_leave_form = `${host}/hr2/api/view_leave_form_data`;
export const leave_edit_handle = `${host}/hr2/api/leave_edit_handle`;
export const leave_file_handle = `${host}/hr2/api/leave_file_handle`;

export const submit_ltc_form = `${host}/hr2/api/ltc/`;
export const get_ltc_requests = `${host}/hr2/api/get_ltc_requests`;
export const get_ltc_inbox = `${host}/hr2/api/get_ltc_inbox`;
export const get_ltc_archive = `${host}/hr2/api/get_ltc_archive`;

export const get_cpda_adv_requests = `${host}/hr2/api/get_cpda_adv_requests`;
export const get_cpda_adv_inbox = `${host}/hr2/api/get_cpda_adv_inbox`;
export const get_cpda_adv_archive = `${host}/hr2/api/get_cpda_adv_archive`;
export const submit_cpda_adv_form = `${host}/hr2/api/cpdaadv/`;
export const view_cpda_adv_form = `${host}/hr2/api/view_cpda_adv_form_data`;

export const get_cpda_claim_requests = `${host}/hr2/api/get_cpda_claim_requests`;
export const get_cpda_claim_inbox = `${host}/hr2/api/get_cpda_claim_inbox`;
export const get_cpda_claim_archive = `${host}/hr2/api/get_cpda_claim_archive`;
export const submit_cpda_claim_form = `${host}/hr2/api/cpdareim/`;

export const get_appraisal_requests = `${host}/hr2/api/get_appraisal_requests`;
export const get_appraisal_inbox = `${host}/hr2/api/get_appraisal_inbox`;
export const get_appraisal_archive = `${host}/hr2/api/get_appraisal_archive`;