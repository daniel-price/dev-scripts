import { describe, expect, it } from "bun:test";

import { exec } from "./execute";

describe("Execute", () => {
  describe("exec", () => {
    it("should execute a string function and return its result", async () => {
      const result = await exec("echo Hello, World!");
      expect(result).toBe("Hello, World!");
    });

    it("should execute a string array function and return its result", async () => {
      const result = await exec(["echo", "Hello, World!"]);
      expect(result).toBe("Hello, World!");
    });
  });
});
