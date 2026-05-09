import { host } from "../globalRoutes";

export const fetchProjectsRoute = `${host}/research_procedures/api/get-projects/`;
export const projectFormSubmissionRoute = `${host}/research_procedures/api/add-project/`;
export const projectRegisterCommencementRoute = `${host}/research_procedures/api/register-commence-project/`;
export const staffDocumentUploadRoute = `${host}/research_procedures/api/staff-document-upload/`;
export const staffSelectionReportRoute = `${host}/research_procedures/api/staff-selection-report/`;
export const advertisementAndCommitteeApprovalFormSubmissionRoute = `${host}/research_procedures/api/add-ad-committee/`;
export const fetchPIDsRoute = (role) =>
  `${host}/research_procedures/api/get-PIDs/?role=${role}`;
export const fetchProfIDsRoute = `${host}/research_procedures/api/get-profIDs/`;
export const fetchBudgetRoute = (pid) =>
  `${host}/research_procedures/api/get-budget/?pid=${pid}`;
export const fetchStaffPositionsRoute = (pid) =>
  `${host}/research_procedures/api/get-staff-positions/?pid=${pid}`;
export const fetchStaffRoute = `${host}/research_procedures/api/get-staff/`;
export const committeeActionRoute = `${host}/research_procedures/api/committee-action/`;
export const staffDecisionRoute = `${host}/research_procedures/api/staff-decision/`;
export const projectClosureRoute = `${host}/research_procedures/api/project-closure/`;
