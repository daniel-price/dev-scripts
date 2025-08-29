import { describe, expect, it } from "bun:test";

import { retry } from "./retry";
import { has } from "./util";

describe("retry", () => {
  it("should return the result of the function if it succeeds first time", async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts++;
      return "success";
    });
    expect(result).toBe("success");
    expect(attempts).toBe(1);
  });

  it("should retry the function if it fails", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("fail");
        }
        return "success";
      },
      { retriesLeft: 5, interval: 10, exponential: false },
    );
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("should throw an error if the function fails and no retries are left", async () => {
    let attempts = 0;
    expect(
      retry(
        async () => {
          attempts++;
          throw new Error("fail");
        },
        { retriesLeft: 2, interval: 10, exponential: false },
      ),
    ).rejects.toThrow("fail");
    expect(attempts).toBe(3);
  });

  it("should not retry if the retryPredicate returns false", async () => {
    let attempts = 0;
    expect(
      retry(
        async () => {
          attempts++;
          throw new Error("fail");
        },
        {
          retriesLeft: 5,
          interval: 10,
          exponential: false,
          retryPredicate: (err) =>
            has(err, "message") && err.message !== "fail",
        },
      ),
    ).rejects.toThrow("fail");
    expect(attempts).toBe(1);
  });

  it("should use exponential backoff if specified", async () => {
    let attempts = 0;
    const start = Date.now();
    expect(
      retry(
        async () => {
          attempts++;
          throw new Error("fail");
        },
        { retriesLeft: 3, interval: 10, exponential: true },
      ),
    ).rejects.toThrow("fail");
    const duration = Date.now() - start;
    // Total wait time should be approximately 10 + 20 + 40 = 70ms
    expect(duration).toBeGreaterThanOrEqual(70);
    expect(attempts).toBe(4);
  });
});
