export class ApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export const getAuthToken = () => localStorage.getItem("authToken");

export const authHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...extraHeaders,
  };
};

export const parseErrorPayload = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload === "string") {
      return { message: payload };
    }
    return payload;
  } catch {
    return null;
  }
};

export const getErrorMessage = (payload, fallback = "Request failed") => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (payload.error) {
    if (typeof payload.error === "string") return payload.error;
    if (payload.error.message) return payload.error.message;
    if (payload.error.code) return payload.error.code;
  }
  if (payload.message) return payload.message;

  const firstKey = Object.keys(payload)[0];
  if (!firstKey) return fallback;
  const fieldError = payload[firstKey];
  if (Array.isArray(fieldError)) {
    return `${firstKey}: ${fieldError.join(", ")}`;
  }
  if (typeof fieldError === "string") {
    return `${firstKey}: ${fieldError}`;
  }
  return fallback;
};

export const authorizedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError("Authentication token is missing.", 401);
  }

  const headers = authHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
};

export const authorizedFetchJson = async (url, options, fallbackError) => {
  const response = await authorizedFetch(url, options || {});
  const payload = await parseErrorPayload(response);
  const normalizedPayload =
    payload?.data !== undefined ? payload.data : payload;

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(
        payload,
        fallbackError || `Request failed with status ${response.status}`,
      ),
      response.status,
      payload,
    );
  }

  return normalizedPayload || {};
};
