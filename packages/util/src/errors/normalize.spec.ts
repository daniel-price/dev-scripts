import { describe, expect, it } from "bun:test";

import { TypeValidationError } from "../runtypes";
import { ScriptExecutionError, SourceValidationError } from "./app-error";
import { normalizeLoggedError } from "./normalize";
import { isValidationArraySummary } from "./validation";

describe("normalizeLoggedError", () => {
  it("normalizes context-only errors", () => {
    expect(normalizeLoggedError("something failed", undefined)).toEqual({
      context: "something failed",
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
    expect(logged.validation?.kind).toBe("validation");
    expect(logged.humanReadableDetails).toContain("Expected:");
    expect(logged.humanReadableDetailsBlock).toBe(true);

    if (
      logged.validation?.kind !== "validation" ||
      !isValidationArraySummary(logged.validation)
    ) {
      throw new Error("expected array validation summary");
    }

    expect(logged.validation.invalidCount).toBe(1);
    expect(logged.validation.totalCount).toBe(2);
    expect(logged.validation.groups[0]?.count).toBe(1);
    expect(logged.stack?.[0]).toMatch(/^at /);
  });

  it("normalizes non-error causes without interpreting tagged data", () => {
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
    expect(logged.validation).toBeUndefined();
    expect(logged.cause?.name).toBe("NonErrorThrown");
    expect(logged.cause?.unknownValue).toEqual({
      kind: "validation",
      expectedType: "Runtype<number>",
      actualData: ["a", "b"],
      details: ["Expected number, but was string", null],
    });
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
    expect(logged.source).toBe("SELECT *\nFROM items");
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
    expect(logged.stderr).toBe("permission denied");
    expect(logged.humanReadableDetails).toBe("permission denied");
  });

  it("normalizes string and unknown errors", () => {
    expect(normalizeLoggedError("ctx", "detail").unknownValue).toBe("detail");

    expect(normalizeLoggedError("ctx", { foo: "bar" }).unknownValue).toEqual({
      foo: "bar",
    });
  });

  it("normalizes Error with required context", () => {
    const error = new Error("bad input");

    expect(normalizeLoggedError("Failed", error).context).toBe("Failed");
    expect(normalizeLoggedError("Failed", error).message).toBe("bad input");
    expect(normalizeLoggedError("Failed", error).name).toBe("Error");
  });
});
