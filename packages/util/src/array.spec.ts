import { describe, expect, it } from "bun:test";

import { chunk, unique } from "./array";

describe("Array", () => {
  describe("unique", () => {
    it("should remove duplicates", () => {
      const array = [1, 2, 2, 3, 4, 4, 5];
      const result = unique(array);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("chunk", () => {
    it("should split array into chunks", () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const result = chunk(array, 3);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });
  });
});
