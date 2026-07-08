import { describe, expect, it } from "bun:test";

import {
  AppError,
  ScriptExecutionError,
  SourceValidationError,
} from "./app-error";

describe("AppError", () => {
  it("serializes structured fields with toJSON", () => {
    const cause = new Error("underlying");
    const error = new AppError("failed", {
      details: {
        kind: "validation",
        expectedType: "Runtype<number>",
        actualData: "x",
      },
      cause,
    });

    expect(error.toJSON()).toEqual({
      name: "AppError",
      message: "failed",
      details: {
        kind: "validation",
        expectedType: "Runtype<number>",
        actualData: "x",
      },
      humanReadableDetails: undefined,
      stack: error.stack,
      cause: {
        name: "Error",
        message: "underlying",
        stack: cause.stack,
        cause: undefined,
      },
    });
  });
});

describe("ScriptExecutionError", () => {
  it("stores stderr directly and as human details", () => {
    const error = new ScriptExecutionError(
      "Command failed",
      "permission denied",
    );

    expect(error).toBeInstanceOf(ScriptExecutionError);
    expect(error.details).toBeUndefined();
    expect(error.stderr).toBe("permission denied");
    expect(error.humanReadableDetails).toBe("permission denied");
  });
});

describe("SourceValidationError", () => {
  it("stores source separately from AppError details", () => {
    const cause = new Error("Syntax error at 2:5");
    const error = new SourceValidationError(
      "The partiql statement provided is invalid",
      "SELECT *\nFROM items",
      { cause },
    );

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error.source).toBe("SELECT *\nFROM items");
    expect(error.details).toBeUndefined();
    expect(error.humanReadableDetails).toContain("2 | FROM items");
    expect(error.humanReadableDetailsBlock).toBe(true);
  });
});
