import { Clipboard, Json, Logger } from "@dev/util";

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
    .replaceAll(/\|/g, "")
    .replaceAll(/\+\d+ms/g, "");

  return res;
}

function formatJson(str: string): string {
  try {
    return Json.stringify(JSON.parse(str));
  } catch (e) {
    return str;
  }
}

type Formatter = (input: string) => string;

const formatters: Array<{
  predicate?: (input: string) => boolean;
  handler: Formatter;
}> = [{ handler: formatString }, { handler: formatJson }];

export async function main(): Promise<void> {
  const clipboard = Clipboard.get();
  let res = clipboard;

  for (const { predicate, handler } of formatters) {
    if (predicate?.(res)) {
      res = handler(res);
    }
  }

  if (!res) {
    Logger.warn("Result is empty, not copying to clipboard");
    return;
  }

  Logger.info(`Copied to clipboard: 
${res}`);
  Clipboard.add(res);
}
