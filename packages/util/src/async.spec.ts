import { describe, expect, it } from "bun:test";

import { batch, map } from "./async";

async function* generateNumbers(): AsyncGenerator<number> {
  for (let i = 1; i <= 7; i++) {
    yield i;
  }
}

describe("Async", () => {
  describe("batch", () => {
    it("should convert async generator into new async generator which generates batches", async () => {
      const batched: number[][] = [];
      const batchSize = 3;

      for await (const chunk of batch(generateNumbers(), batchSize)) {
        batched.push(chunk);
      }

      expect(batched).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });
  });

  describe("map", () => {
    it("should map async generator to new async generator", async () => {
      const mapped: number[] = [];
      const mapFn = (x: number): number => x * 2;

      for await (const item of map(generateNumbers(), mapFn)) {
        mapped.push(item);
      }

      expect(mapped).toEqual([2, 4, 6, 8, 10, 12, 14]);
    });
  });
});
