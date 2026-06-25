import { afterEach, describe, expect, it } from "bun:test";

import { prettyErrorFormatter } from "./pretty";

const originalNoColor = process.env.NO_COLOR;

afterEach(() => {
  if (originalNoColor === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = originalNoColor;
  }
});

describe("PrettyErrorFormatter", () => {
  it("formats validation errors with expected summary lines", () => {
    process.env.NO_COLOR = "1";

    const humanReadableDetails = [
      "  Details:",
      "    Expected:",
      "      { attempts_left?: number }[]",
      "",
      "    Invalid items:",
      "      7315 / 40927",
      "",
      "    Most common violation:",
      '      { attempts_left: "9" } × 7315',
      "      → Expected number, but got string",
    ].join("\n");

    const output = prettyErrorFormatter.format({
      context: "Failed to run script: partiql.ts",
      message: "Data does not match expected type",
      name: "TypeValidationError",
      humanReadableDetails,
      humanReadableDetailsBlock: true,
      stack: ["at assertType (.../runtypes.ts:50:13)", "at partiql.ts:15:32"],
    });

    expect(output).toBe(
      [
        "[ERROR] Failed to run script: partiql.ts",
        "",
        "caused by:",
        "  Data does not match expected type",
        "",
        humanReadableDetails,
        "",
        "  Stack:",
        "    at assertType (.../runtypes.ts:50:13)",
        "    at partiql.ts:15:32",
      ].join("\n"),
    );
    expect(output).not.toContain("\x1b[32m");
  });

  it("formats source errors with layered caused-by sections", () => {
    process.env.NO_COLOR = "1";

    const output = prettyErrorFormatter.format({
      context: "Failed to run script: partiql.ts",
      message: "The partiql statement provided is invalid",
      name: "ValidationError",
      data: { kind: "source", source: "SELECT *\nFROM items" },
      humanReadableDetails: [
        "1 | SELECT *",
        "2 | FROM items",
        "  |     ^",
      ].join("\n"),
      humanReadableDetailsBlock: true,
      cause: {
        message: "Syntax error at 2:5",
        name: "Error",
      },
      stack: ["at fetchPartiqlPage (.../dynamo.ts:144:15)"],
    });

    expect(output).toBe(
      [
        "[ERROR] Failed to run script: partiql.ts",
        "",
        "caused by:",
        "  The partiql statement provided is invalid",
        "",
        "1 | SELECT *",
        "2 | FROM items",
        "  |     ^",
        "",
        "caused by:",
        "Error: Syntax error at 2:5",
        "",
        "  Stack:",
        "    at fetchPartiqlPage (.../dynamo.ts:144:15)",
      ].join("\n"),
    );
  });
});
