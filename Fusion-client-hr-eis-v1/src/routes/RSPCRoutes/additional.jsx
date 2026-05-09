import { host } from "../globalRoutes";

export const filterRoutes = {
  researchProjects: `${host}/eis/api/projects/filter/`,
  consultancyProjects: `${host}/eis/api/consultancy_projects/filter/`,
  patents: `${host}/eis/api/patents/filter/`,
  pgPhdThesis: `${host}/eis/api/pg_phd_thesis/filter/`,
  eventsOrganized: `${host}/eis/api/event/filter/`,
  visits: `${host}/eis/api/visits/filter/`,
  eventsAttended: `${host}/eis/api/consym/filter/`,
  books: `${host}/eis/api/fetch_book/filter/`,
  journalOrConference: `${host}/eis/api/fetch_journal_or_conference/filter/`,
  achievements: `${host}/eis/api/award/filter/`,
  expertLectures: `${host}/eis/api/talk/filter/`,
};
export const dataTypeToEndpoint = {
  publications_journal: filterRoutes.journalOrConference,
  publications_books: filterRoutes.books,
  publications_conference: filterRoutes.journalOrConference,
  projects_research: filterRoutes.researchProjects,
  projects_patents: filterRoutes.patents,
  projects_consultancy: filterRoutes.consultancyProjects,
  thesis_pg: filterRoutes.pgPhdThesis,
  thesis_phd: filterRoutes.pgPhdThesis,
  events_organized_workshop: filterRoutes.eventsOrganized,
  visits_foreign: filterRoutes.visits,
  visits_indian: filterRoutes.visits,
  events_attended: filterRoutes.eventsAttended,
  others_achievements: filterRoutes.achievements,
  others_honors: filterRoutes.achievements,
  expert_lectures: filterRoutes.expertLectures,
};
export const getAllFacultyIdsRoute = `${host}/eis/api/get_id/`;
