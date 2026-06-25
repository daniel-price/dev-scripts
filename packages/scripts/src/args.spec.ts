import { R } from "@dev/util";
import { describe, expect, it } from "bun:test";

import {
  buildMriOptions,
  clipboard,
  isClipboardDefault,
  pickSchemaArgs,
} from "./args";

describe("isClipboardDefault", () => {
  it("identifies clipboard defaults", () => {
    expect(isClipboardDefault(clipboard)).toBe(true);
    expect(isClipboardDefault("value")).toBe(false);
  });
});

describe("buildMriOptions", () => {
  it("maps short flags and boolean args", () => {
    const options = buildMriOptions({
      name: { type: R.String, short: "n" },
      verbose: { type: R.Boolean },
      count: { type: R.Number.optional() },
    });

    expect(options.alias).toEqual({ h: "help", n: "name" });
    expect(options.boolean).toEqual(["help", "verbose"]);
  });
});

describe("pickSchemaArgs", () => {
  it("keeps only schema keys from raw CLI args", () => {
    const picked = pickSchemaArgs(
      {
        name: { type: R.String },
        flag: { type: R.Boolean.optional() },
      },
      {
        name: "alice",
        flag: true,
        help: true,
        _: ["ignored"],
      },
    );

    expect(picked).toEqual({ name: "alice", flag: true });
  });
});

describe("parseArgs", () => {
  it("applies literal defaults and validates args", async () => {
    const { parseArgs } = await import("./args");

    const parsed = await parseArgs(
      {
        name: { type: R.String },
        retries: { type: R.Number.optional(), default: 3 },
        verbose: { type: R.Boolean.optional(), default: false },
      },
      { name: "alice" },
    );

    expect(parsed).toEqual({
      name: "alice",
      retries: 3,
      verbose: false,
    });
  });

  it("throws when args fail runtype validation", async () => {
    const { parseArgs } = await import("./args");

    await expect(
      parseArgs(
        {
          count: { type: R.Number },
        },
        { count: "not-a-number" },
      ),
    ).rejects.toThrow("Data does not match expected type");
  });
});
