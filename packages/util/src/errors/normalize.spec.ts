import { describe, expect, it } from "bun:test";

import { TypeValidationError } from "../runtypes";
import {
  ScriptExecutionError,
  SourceValidationError,
  ValidationError,
} from "./app-error";
import { getErrorMessage, normalizeLoggedError } from "./normalize";
import { isValidationArraySummary } from "./validation";

describe("getErrorMessage", () => {
  it("reads message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads message from plain objects", () => {
    expect(getErrorMessage({ message: "plain" })).toBe("plain");
  });

  it("returns undefined for non-errors", () => {
    expect(getErrorMessage(42)).toBeUndefined();
  });
});

describe("normalizeLoggedError", () => {
  it("normalizes context-only errors", () => {
    expect(normalizeLoggedError("something failed")).toEqual({
      message: "something failed",
      name: "Error",
    });
  });

  it("summarizes validation details on TypeValidationError", () => {
    const error = new TypeValidationError({
      kind: "validation",
      expectedType: "Runtype<number>",
      actualData: ["a", "b"],
      details: ["Expected number, but was string", null],
    });

    const logged = normalizeLoggedError("Error running script", error);

    expect(logged.context).toBe("Error running script");
    expect(logged.message).toBe("Data does not match expected type");
    expect(error).toBeInstanceOf(TypeValidationError);
    expect(logged.name).toBe("TypeValidationError");
    expect(logged.data?.kind).toBe("validation");
    expect(logged.humanReadableDetails).toContain("Expected:");
    expect(logged.humanReadableDetailsBlock).toBe(true);

    if (
      logged.data?.kind !== "validation" ||
      !isValidationArraySummary(logged.data)
    ) {
      throw new Error("expected array validation summary");
    }

    expect(logged.data.invalidCount).toBe(1);
    expect(logged.data.totalCount).toBe(2);
    expect(logged.data.groups[0]?.count).toBe(1);
    expect(logged.stack?.[0]).toMatch(/^at /);
  });

  it("summarizes validation causes on plain errors", () => {
    const error = new Error("Data does not match expected type", {
      cause: {
        kind: "validation",
        expectedType: "Runtype<number>",
        actualData: ["a", "b"],
        details: ["Expected number, but was string", null],
      },
    });

    const logged = normalizeLoggedError("Error running script", error);

    expect(logged.context).toBe("Error running script");
    expect(logged.message).toBe("Data does not match expected type");
    expect(logged.data?.kind).toBe("validation");
    expect(logged.cause).toBeUndefined();
  });

  it("normalizes SourceValidationError with source data and nested cause", () => {
    const awsError = new Error("Syntax error at 2:5");
    const error = new SourceValidationError(
      "The partiql statement provided is invalid",
      "SELECT *\nFROM items",
      { cause: awsError },
    );

    const logged = normalizeLoggedError("Error running script", error);

    expect(logged.message).toBe("The partiql statement provided is invalid");
    expect(logged.name).toBe("SourceValidationError");
    expect(logged.humanReadableDetails).toContain("1 | SELECT *");
    expect(logged.humanReadableDetails).not.toContain("Error:");
    expect(logged.humanReadableDetailsBlock).toBe(true);
    expect(logged.data).toEqual({
      kind: "source",
      source: "SELECT *\nFROM items",
    });
    expect(logged.cause?.message).toBe("Syntax error at 2:5");
  });

  it("normalizes ScriptExecutionError", () => {
    const error = new ScriptExecutionError(
      "Command failed",
      "permission denied",
    );

    const logged = normalizeLoggedError("Command failed", error);

    expect(error).toBeInstanceOf(ScriptExecutionError);
    expect(logged.name).toBe("ScriptExecutionError");
    expect(logged.data).toEqual({
      kind: "execute",
      stderr: "permission denied",
    });
    expect(logged.humanReadableDetails).toBe("permission denied");
  });

  it("normalizes string and unknown errors", () => {
    expect(normalizeLoggedError("ctx", "detail").data).toEqual({
      kind: "unknown",
      value: "detail",
    });

    expect(normalizeLoggedError("ctx", { foo: "bar" }).data).toEqual({
      kind: "unknown",
      value: { foo: "bar" },
    });
  });

  it("normalizes AppError passed as sole argument", () => {
    const error = new ValidationError("bad input", {
      kind: "unknown",
      value: "x",
    });

    expect(normalizeLoggedError(error).message).toBe("bad input");
    expect(normalizeLoggedError(error).name).toBe("ValidationError");
  });
});
