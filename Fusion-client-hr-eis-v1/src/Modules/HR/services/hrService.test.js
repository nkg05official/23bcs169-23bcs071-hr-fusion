import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizedFetch = vi.fn();
const mockAuthorizedFetchJson = vi.fn();
const mockParseErrorPayload = vi.fn();
const mockGetErrorMessage = vi.fn();

vi.mock("./api", () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  },
  authorizedFetch: (...args) => mockAuthorizedFetch(...args),
  authorizedFetchJson: (...args) => mockAuthorizedFetchJson(...args),
  parseErrorPayload: (...args) => mockParseErrorPayload(...args),
  getErrorMessage: (...args) => mockGetErrorMessage(...args),
}));

vi.mock("../api", () => ({
  get_form_track: (id) => `/track/${id}`,
  search_employees: "/search",
  submit_cpda_claim_form: "/cpda-claim",
}));

describe("HR service wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchEmployees returns normalized employees list", async () => {
    const { searchEmployees } = await import("./hrService");

    mockAuthorizedFetchJson.mockResolvedValue({
      employees: [{ id: 1, username: "alice" }],
    });

    const result = await searchEmployees("ali", { limit: 25, offset: 5 });

    expect(mockAuthorizedFetchJson).toHaveBeenCalledWith(
      "/search?search_text=ali&limit=25&offset=5",
      {},
      "Unable to fetch data from server",
    );
    expect(result).toEqual([{ id: 1, username: "alice" }]);
  });

  it("submitFormDataWithAuth throws normalized ApiError on failure", async () => {
    const { submitFormDataWithAuth } = await import("./hrService");

    const fakeResponse = { ok: false, status: 400 };
    const formData = new FormData();

    mockAuthorizedFetch.mockResolvedValue(fakeResponse);
    mockParseErrorPayload.mockResolvedValue({
      error: { message: "Bad request" },
    });
    mockGetErrorMessage.mockReturnValue("Bad request");

    await expect(
      submitFormDataWithAuth("/submit", formData, "fallback"),
    ).rejects.toMatchObject({
      message: "Bad request",
      status: 400,
    });
  });
});
