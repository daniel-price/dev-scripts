import { describe, expect, it } from "bun:test";
import { toDecimalPlaces } from "./util";

describe("toDecimalPlaces", () => {
  it("should round 2 dp to 1", () => {
    const result = toDecimalPlaces(1.23, 1);
    expect(result).toEqual(1.2);
  });

  it("should round 2 dp to 2", () => {
    const result = toDecimalPlaces(1.23, 2);
    expect(result).toEqual(1.23);
  });

  it("should round 2 dp to 2", () => {
    const result = toDecimalPlaces(1.23, 3);
    expect(result).toEqual(1.23);
  });
});
