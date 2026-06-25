import { afterEach, describe, expect, it } from "bun:test";

import {
  formatSourceLocation,
  formatSourceWithGutter,
  highlightSourceFromErrorMessage,
  parseSourceErrorLocation,
  supportsAnsiColor,
} from "./terminal";

const originalNoColor = process.env.NO_COLOR;
const originalForceColor = process.env.FORCE_COLOR;

afterEach(() => {
  if (originalNoColor === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = originalNoColor;
  }

  if (originalForceColor === undefined) {
    delete process.env.FORCE_COLOR;
  } else {
    process.env.FORCE_COLOR = originalForceColor;
  }
});

describe("supportsAnsiColor", () => {
  it("returns false when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";
    expect(supportsAnsiColor()).toBe(false);
  });

  it("returns true when FORCE_COLOR is set", () => {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = "1";
    expect(supportsAnsiColor()).toBe(true);
  });
});

describe("parseSourceErrorLocation", () => {
  it("parses dynamodb line and column locations", () => {
    expect(
      parseSourceErrorLocation(
        "Unexpected path component ('+') at line 1, column 9",
      ),
    ).toEqual({ line: 1, column: 9, length: 1 });
  });

  it("parses legacy line:column locations", () => {
    expect(parseSourceErrorLocation("Syntax error at 2:8:4")).toEqual({
      line: 2,
      column: 8,
      length: 4,
    });
  });
});

describe("formatSourceWithGutter", () => {
  it("renders numbered lines with a caret row", () => {
    expect(formatSourceWithGutter("SELECT O+C\nFROM items", 1, 9)).toEqual(
      ["1 | SELECT O+C", "  |         ^", "2 | FROM items"].join("\n"),
    );
  });
});

describe("highlightSourceFromErrorMessage", () => {
  it("highlights the source location referenced in the error message", () => {
    process.env.NO_COLOR = "1";

    const source = "line one\nSELECT bad\nline three";
    const highlighted = highlightSourceFromErrorMessage(
      source,
      "Syntax error at 2:8:4",
    );

    expect(highlighted).toContain("SELECT bad");
    expect(highlighted).not.toBe(source);
  });

  it("returns undefined when the error message has no location", () => {
    expect(
      highlightSourceFromErrorMessage("SELECT 1", "generic failure"),
    ).toBeUndefined();
  });
});

describe("formatSourceLocation", () => {
  it("uses caret output when color is disabled", () => {
    process.env.NO_COLOR = "1";

    const lines = formatSourceLocation(["SELECT bad"], 1, 8, 3);

    expect(lines).toEqual(["SELECT bad", "       ^^^"]);
  });
});
