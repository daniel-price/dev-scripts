import { Json, Logger, R, Util } from "@dev/util";
import prettier from "prettier";

import { clipboard } from "./args";
import { defineScript } from "./script";

export default defineScript({
  args: {
    input: {
      type: R.String,
      description: "The input string to parse.",
      default: clipboard,
    },
  },
  help: () => {
    return "This is a new script. Edit the run function to add your logic.";
  },
  run: async (args) => {
    Logger.info("Running parse-bytes script with args", args);

    const payload = parseBytes(args.input);
    Logger.info("Parsed payload:", payload);

    const formatted =
      Util.has(payload, "body") &&
      typeof payload.body === "string" &&
      (await formatGraphQl(payload.body));
    Logger.info("Formatted body:", formatted);
  },
});

async function formatGraphQl(str: string): Promise<string> {
  try {
    return await prettier.format(str, { parser: "graphql" });
  } catch {
    return str;
  }
}

function parseByteArray(input: string): number[] {
  const trimmed = input.trim();

  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (Array.isArray(parsed)) {
      return parsed as number[];
    }
  } catch {
    // not JSON — parse as comma-separated bytes
  }

  return trimmed.split(",").map((s) => parseInt(s.trim(), 10));
}

export function parseBytes(input: string): Record<string, unknown> {
  const byteArray = parseByteArray(input);
  Logger.info("Parsed byte array:", byteArray);

  const jsonText = new TextDecoder().decode(Uint8Array.from(byteArray));
  return Json.parse(jsonText, R.Record({}));
}
