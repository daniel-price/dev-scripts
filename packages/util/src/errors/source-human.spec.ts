import { describe, expect, it } from "bun:test";

import { formatSourceDetails } from "./source-human";

describe("formatSourceDetails", () => {
  it("formats partiql source errors with gutter, caret, and error", () => {
    const source = [
      "SELECT O+C",
      'FROM "dentr-apis-verification-live-patient-accounts"',
    ].join("\n");
    const causeMessage = "Unexpected path component ('+') at line 1, column 9";

    expect(formatSourceDetails({ kind: "source", source }, causeMessage)).toBe(
      [
        "1 | SELECT O+C",
        "  |         ^",
        '2 | FROM "dentr-apis-verification-live-patient-accounts"',
      ].join("\n"),
    );
  });

  it("supports legacy at line:column error messages", () => {
    const source = "SELECT *\nFROM items";

    expect(
      formatSourceDetails({ kind: "source", source }, "Syntax error at 2:5"),
    ).toBe(["1 | SELECT *", "2 | FROM items", "  |     ^"].join("\n"));
  });
});
