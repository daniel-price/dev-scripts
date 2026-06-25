import { Clipboard, Json, Logger, R } from "@dev/util";
import prettier from "prettier";

import { clipboard } from "./args";
import { defineScript } from "./script";

function formatString(str: string): string {
  let res = str;

  res = res
    .replaceAll(/^"/g, "")
    .replaceAll(/"$/g, "")
    .replaceAll("    +", "")
    .replaceAll(" Object ", "")
    .replaceAll(" Array ", "")
    .replaceAll("\\\\n", `\n`)
    .replaceAll("\\n", `\n`)
    .replaceAll(`\\\\"`, `"`)
    .replaceAll(`\\"`, `"`)
    //replace + from the beginning of each line
    .replaceAll(/^\+/gm, "")
    //copied from SST logging
    .replaceAll(/^\s*\|/g, "")
    .replaceAll(/\+\d+ms/g, "");

  return res;
}

async function formatGraphql(str: string): Promise<string> {
  try {
    return await prettier.format(str, { parser: "graphql" });
  } catch {
    return str;
  }
}

function formatJson(str: string): string {
  try {
    return Json.stringify(JSON.parse(str));
  } catch {
    return str;
  }
}

type Formatter = (input: string) => string | Promise<string>;

const formatters: Array<{
  predicate?: (input: string) => boolean;
  handler: Formatter;
}> = [
  { handler: formatString },
  { handler: formatGraphql },
  { handler: formatJson },
];

export async function formatInput(input: string): Promise<string> {
  let res = input;

  for (const { predicate, handler } of formatters) {
    if (!predicate || predicate(res)) {
      res = await handler(res);
    }
  }

  return res;
}

export default defineScript({
  args: {
    input: {
      type: R.String,
      short: "i",
      description: "The input to format",
      default: clipboard,
    },
  },
  help: () => {
    return `This script formats the clipboard content.`;
  },
  run: async (args) => {
    const res = await formatInput(args.input);

    if (!res) {
      Logger.warn("Result is empty, not copying to clipboard");
      return;
    }

    Logger.info(`Copied to clipboard: 
${res}`);
    Clipboard.add(res);
  },
});
