import { beforeEach, describe, expect, it, vi } from "vitest";
import { getErrorMessage, authHeaders } from "./api";

describe("HR api helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
  });

  it("extracts nested message from structured error payload", () => {
    const payload = {
      error: {
        code: "ERR_VALIDATION",
        message: "Validation failed",
      },
    };

    expect(getErrorMessage(payload)).toBe("Validation failed");
  });

  it("extracts first field error when payload is field-based", () => {
    const payload = {
      leaveStartDate: ["Leave start date cannot be in the past"],
    };

    expect(getErrorMessage(payload)).toBe(
      "leaveStartDate: Leave start date cannot be in the past",
    );
  });

  it("merges auth header with extra headers", () => {
    const headers = authHeaders({ "Content-Type": "application/json" });

    expect(headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });
});
