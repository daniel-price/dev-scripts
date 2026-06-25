import { describe, expect, it } from "bun:test";

import * as R from "./runtypes";

describe("assertType", () => {
  it("returns validated data on success", () => {
    expect(R.assertType(R.Number, 42)).toBe(42);
  });

  it("throws TypeValidationError with structured validation details", () => {
    try {
      R.assertType(R.Number, "not a number");
      throw new Error("expected assertType to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(R.TypeValidationError);
      if (!(error instanceof R.TypeValidationError)) return;

      expect(error.message).toBe("Data does not match expected type");
      expect(error).toBeInstanceOf(R.TypeValidationError);
      expect(error.validation.expectedType).toContain("number");
      expect(error.validation.actualData).toBe("not a number");
      expect(error.humanReadableDetails).toContain("Expected:");
      expect(error.humanReadableDetailsBlock).toBe(true);
    }
  });
});

describe("isBooleanRuntype", () => {
  it("detects boolean runtypes including optional booleans", () => {
    expect(R.isBooleanRuntype(R.Boolean)).toBe(true);
    expect(R.isBooleanRuntype(R.String)).toBe(false);
    expect(R.isBooleanRuntype(R.Boolean.optional())).toBe(true);
  });
});
