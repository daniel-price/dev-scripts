import { describe, expect, it } from "bun:test";

import * as SetUtil from "./set";

describe("set", () => {
  it("should return the difference between two sets", async () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 4, 3]);
    const result = SetUtil.difference(set1, set2);
    expect(result).toEqual({ inAButNotB: [2], inBButNotA: [4] });
  });

  it("should handle empty sets", async () => {
    const set1 = new Set([]);
    const set2 = new Set([]);
    const result = SetUtil.difference(set1, set2);
    expect(result).toEqual({ inAButNotB: [], inBButNotA: [] });
  });

  it("should handle one empty set", async () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([]);
    const result = SetUtil.difference(set1, set2);
    expect(result).toEqual({ inAButNotB: [1, 2, 3], inBButNotA: [] });
  });

  it("should handle two empty sets", async () => {
    const set1 = new Set([]);
    const set2 = new Set([]);
    const result = SetUtil.difference(set1, set2);
    expect(result).toEqual({ inAButNotB: [], inBButNotA: [] });
  });

  it("should handle two sets with the same elements", async () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);
    const result = SetUtil.difference(set1, set2);
    expect(result).toEqual({ inAButNotB: [], inBButNotA: [] });
  });
});
