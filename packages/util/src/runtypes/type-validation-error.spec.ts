import { describe, expect, it } from "bun:test";

import { TypeValidationError } from "./type-validation-error";

describe("TypeValidationError", () => {
  it("exposes structured validation and human-readable details", () => {
    const error = new TypeValidationError({
      kind: "validation",
      expectedType: "Runtype<{ attempts_left?: number }[]>",
      actualData: Array.from({ length: 40927 }, (_, i) => ({
        attempts_left: i < 7315 ? "9" : 1,
      })),
      details: Array.from({ length: 40927 }, (_, i) =>
        i < 7315 ? "Expected number, but got string" : null,
      ),
    });

    expect(error).toBeInstanceOf(TypeValidationError);
    expect(error.validation.kind).toBe("validation");
    expect(error.humanReadableDetails).toContain("Expected:");
    expect(error.humanReadableDetails).toContain(
      "{ attempts_left?: number }[]",
    );
    expect(error.humanReadableDetails).toContain("7315 / 40927");
    expect(error.humanReadableDetails).toContain(
      '{ attempts_left: "9" } × 7315',
    );
    expect(error.humanReadableDetailsBlock).toBe(true);
  });
});
