import { describe, expect, it } from "bun:test";

import { parseBytes } from "./parse-bytes";

describe("parseBytes", () => {
  it("parses a JSON array of bytes into an object payload", () => {
    const byteArray = Array.from(
      new TextEncoder().encode(
        JSON.stringify({
          headers: { "content-type": "application/json" },
          body: "hello",
        }),
      ),
    );

    const result = parseBytes(JSON.stringify(byteArray));

    expect(result.headers).toEqual({ "content-type": "application/json" });
    expect(result.body).toBe("hello");
  });

  it("parses a double-encoded JSON string of bytes", () => {
    const byteArray = Array.from(
      new TextEncoder().encode(JSON.stringify({ ok: true })),
    );
    const input = JSON.stringify(JSON.stringify(byteArray));

    expect(parseBytes(input)).toEqual({ ok: true });
  });

  it("parses comma-separated byte values", () => {
    const byteArray = Array.from(
      new TextEncoder().encode(JSON.stringify({ value: 1 })),
    );

    expect(parseBytes(byteArray.join(","))).toEqual({ value: 1 });
  });
});
