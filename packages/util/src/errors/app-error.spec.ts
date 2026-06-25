import { describe, expect, it } from "bun:test";

import { AppError, ScriptExecutionError } from "./app-error";

describe("AppError", () => {
  it("serializes structured fields with toJSON", () => {
    const cause = new Error("underlying");
    const error = new AppError("failed", {
      details: { kind: "unknown", value: "x" },
      cause,
    });

    expect(error.toJSON()).toEqual({
      name: "AppError",
      message: "failed",
      details: { kind: "unknown", value: "x" },
      humanReadableDetails: "x",
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
  it("stores stderr in execute details and human details", () => {
    const error = new ScriptExecutionError(
      "Command failed",
      "permission denied",
    );

    expect(error).toBeInstanceOf(ScriptExecutionError);
    expect(error.details).toEqual({
      kind: "execute",
      stderr: "permission denied",
    });
    expect(error.humanReadableDetails).toBe("permission denied");
  });
});
