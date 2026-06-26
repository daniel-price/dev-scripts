import { describe, expect, it } from "bun:test";

import {
  isValidationArraySummary,
  isValidationErrorData,
  MAX_INVALID_GROUPS,
  summarizeValidation,
} from "./validation";

describe("isValidationErrorData", () => {
  it("accepts typed validation cause objects", () => {
    expect(
      isValidationErrorData({
        kind: "validation",
        expectedType: "Runtype<string>",
        actualData: "nope",
      }),
    ).toBe(true);
  });

  it("rejects duck-typed objects without kind", () => {
    expect(
      isValidationErrorData({
        expectedType: "Runtype<string>",
        actualData: "nope",
      }),
    ).toBe(false);
  });
});

describe("summarizeValidation", () => {
  it("groups invalid array items by value and message", () => {
    const summary = summarizeValidation({
      kind: "validation",
      expectedType: "Runtype<{ n?: number }>",
      actualData: [{ n: "1" }, { n: "1" }, { n: 2 }, { n: 2 }, { n: 2 }],
      details: [
        { n: "Expected number, but was string" },
        { n: "Expected number, but was string" },
        null,
        null,
        null,
      ],
    });

    expect(isValidationArraySummary(summary)).toBe(true);
    if (!isValidationArraySummary(summary)) return;

    expect(summary.invalidCount).toBe(2);
    expect(summary.totalCount).toBe(5);
    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0]).toEqual({
      item: { n: "1" },
      count: 2,
      message: "Expected number, but was string",
    });
    expect(summary.omittedGroupCount).toBe(0);
  });

  it("sorts groups by count descending", () => {
    const summary = summarizeValidation({
      kind: "validation",
      expectedType: "Runtype<number>",
      actualData: ["a", "a", "b", "b", "b"],
      details: [
        "Expected number, but was string",
        "Expected number, but was string",
        "Expected number, but was string",
        "Expected number, but was string",
        "Expected number, but was string",
      ],
    });

    expect(isValidationArraySummary(summary)).toBe(true);
    if (!isValidationArraySummary(summary)) return;

    expect(summary.groups[0]?.count).toBe(3);
    expect(summary.groups[1]?.count).toBe(2);
  });

  it("caps groups and reports omitted count", () => {
    const actualData = Array.from(
      { length: MAX_INVALID_GROUPS + 3 },
      (_, i) => ({
        id: i,
      }),
    );
    const details = actualData.map(() => "bad");

    const summary = summarizeValidation({
      kind: "validation",
      expectedType: "Runtype<{ id: number }>",
      actualData,
      details,
    });

    expect(isValidationArraySummary(summary)).toBe(true);
    if (!isValidationArraySummary(summary)) return;

    expect(summary.groups).toHaveLength(MAX_INVALID_GROUPS);
    expect(summary.omittedGroupCount).toBe(3);
  });

  it("summarizes non-array validation with fallback details", () => {
    const summary = summarizeValidation({
      kind: "validation",
      expectedType: "Runtype<string>",
      actualData: 42,
      details: { value: "Expected string, but was number" },
    });

    expect(isValidationArraySummary(summary)).toBe(false);
    if (isValidationArraySummary(summary)) return;

    expect(summary.actual).toBe(42);
    expect(summary.detailMessages).toContain(
      "value: Expected string, but was number",
    );
  });

  it("handles deeply nested validation details without overflowing the stack", () => {
    let details: Record<string, unknown> = { leaf: "deep error" };
    for (let i = 0; i < 5_000; i++) {
      details = { [`level${i}`]: details };
    }

    const summary = summarizeValidation({
      kind: "validation",
      expectedType: "Runtype<string>",
      actualData: 42,
      details,
    });

    expect(isValidationArraySummary(summary)).toBe(false);
    if (isValidationArraySummary(summary)) return;

    expect(summary.detailMessages[0]).toMatch(/level0: .*: deep error$/);
  });
});
