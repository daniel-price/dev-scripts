import { describe, expect, it } from "bun:test";

import { isEnumValue, toMap } from "./enum";

enum Colors {
  RED = "red",
  GREEN = "green",
  BLUE = "blue",
}

describe("Enum", () => {
  describe("toMap", () => {
    it("should convert enum to a map", async () => {
      const colorMap = toMap(Colors);

      expect(colorMap.size).toBe(3);
      expect(colorMap.get("RED")).toBe("red");
      expect(colorMap.get("GREEN")).toBe("green");
      expect(colorMap.get("BLUE")).toBe("blue");
    });
  });

  describe("isEnumValue", () => {
    it("should return true if value is in enum", async () => {
      const result = isEnumValue("RED", Colors);
      expect(result).toBe(true);
    });

    it("should return false if value is not in enum", async () => {
      const result = isEnumValue("YELLOW", Colors);
      expect(result).toBe(false);
    });

    it("should return false if value is not a string", async () => {
      const result = isEnumValue(123, Colors);
      expect(result).toBe(false);
    });
  });
});
