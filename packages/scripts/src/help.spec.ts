import { R } from "@dev/util";
import { describe, expect, it } from "bun:test";

import { clipboard } from "./args";
import { formatHelp } from "./help";

describe("formatHelp", () => {
  it("formats usage and options for string, boolean, and clipboard defaults", () => {
    const help = formatHelp("my-script", {
      name: {
        type: R.String,
        short: "n",
        description: "A name",
        default: "alice",
      },
      input: {
        type: R.String,
        description: "Input from clipboard",
        default: clipboard,
      },
      verbose: {
        type: R.Boolean.optional(),
        short: "v",
        description: "Verbose output",
        default: false,
      },
    });

    expect(help).toContain("Usage:");
    expect(help).toContain("my-script");
    expect(help).toContain("[-n=<name>|--name=<name>]");
    expect(help).toContain("[-v|--verbose]");
    expect(help).toContain("-n, --name=<name>");
    expect(help).toContain('A name [default: "alice"]');
    expect(help).toContain("[default: clipboard]");
    expect(help).toContain("-h, --help");
  });
});
