import { afterEach, describe, expect, it } from "bun:test";

import { getErrorFormatter } from "../index";
import { jsonErrorFormatter } from "./json";

const originalLogFormat = process.env.LOG_FORMAT;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalLogFormat === undefined) {
    delete process.env.LOG_FORMAT;
  } else {
    process.env.LOG_FORMAT = originalLogFormat;
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

describe("JsonErrorFormatter", () => {
  it("serializes logged errors as JSON with summarized validation data", () => {
    const output = jsonErrorFormatter.format({
      context: "Error running script",
      message: "Data does not match expected type",
      name: "TypeValidationError",
      data: {
        kind: "validation",
        expectedType: "Runtype<number>",
        invalidCount: 1,
        totalCount: 2,
        groups: [
          {
            item: "a",
            count: 1,
            message: "Expected number, but was string",
          },
        ],
        omittedGroupCount: 0,
      },
      stack: ["at assertType (runtypes.ts:50:13)"],
    });

    const parsed = JSON.parse(output) as {
      level: string;
      context: string;
      name: string;
      data: { invalidCount: number; groups: unknown[] };
    };

    expect(parsed.level).toBe("error");
    expect(parsed.context).toBe("Error running script");
    expect(parsed.name).toBe("TypeValidationError");
    expect(parsed.data.invalidCount).toBe(1);
    expect(parsed.data.groups).toHaveLength(1);
    expect(output).not.toContain("actualData");
  });
});

describe("getErrorFormatter", () => {
  it("returns pretty formatter by default", () => {
    delete process.env.LOG_FORMAT;
    delete process.env.NODE_ENV;
    expect(getErrorFormatter().constructor.name).toBe("PrettyErrorFormatter");
  });

  it("returns json formatter when LOG_FORMAT=json", () => {
    process.env.LOG_FORMAT = "json";
    expect(getErrorFormatter().constructor.name).toBe("JsonErrorFormatter");
  });

  it("returns json formatter in production", () => {
    delete process.env.LOG_FORMAT;
    process.env.NODE_ENV = "production";
    expect(getErrorFormatter().constructor.name).toBe("JsonErrorFormatter");
  });
});
