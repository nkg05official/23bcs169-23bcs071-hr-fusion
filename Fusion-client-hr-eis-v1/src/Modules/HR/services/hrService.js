import {
  get_form_track,
  search_employees,
  submit_cpda_claim_form,
} from "../api";
import {
  ApiError,
  authorizedFetch,
  authorizedFetchJson,
  getErrorMessage,
  parseErrorPayload,
} from "./api";

const unwrapData = (payload) => {
  if (!payload) return {};
  if (payload.success && payload.data !== undefined) return payload.data || {};
  return payload;
};

const fetchJson = async (url) =>
  unwrapData(
    await authorizedFetchJson(url, {}, "Unable to fetch data from server"),
  );

export const fetchHrCollection = async (url, responseKey) => {
  const data = await fetchJson(url);
  return data?.[responseKey] || [];
};

export const fetchHrTrackHistory = async (id) => {
  const data = await fetchJson(get_form_track(id));
  return data?.file_history || [];
};

export const fetchJsonWithAuth = (url, fallbackError) =>
  authorizedFetchJson(url, {}, fallbackError || "Unable to fetch data").then(
    unwrapData,
  );

export const searchEmployees = async (searchText, options = {}) => {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const data = await fetchJson(
    `${search_employees}?search_text=${encodeURIComponent(searchText)}&limit=${limit}&offset=${offset}`,
  );
  return data?.employees || [];
};

export const submitJsonWithAuth = (url, payload, fallbackError) =>
  authorizedFetchJson(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    fallbackError,
  ).then(unwrapData);

export const submitFormDataWithAuth = async (url, formData, fallbackError) => {
  const response = await authorizedFetch(url, {
    method: "POST",
    body: formData,
  });

  const payload = await parseErrorPayload(response);
  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, fallbackError || "Request failed"),
      response.status,
      payload,
    );
  }
  return unwrapData(payload || {});
};

export const submitCpdaClaimForm = (formData) =>
  submitJsonWithAuth(
    submit_cpda_claim_form,
    formData,
    "Failed to submit CPDA claim form",
  );
