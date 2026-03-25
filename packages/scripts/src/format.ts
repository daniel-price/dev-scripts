import { Clipboard, Json, Logger } from "@dev/util";

function format(str: string): string | null {
  let res = str;

  res = parseJson(res);

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

  res = parseJson(res);

  return res;
}

function parseJson(str: string): string {
  try {
    return Json.stringify(JSON.parse(str));
  } catch (e) {
    return str;
  }
}

export async function main(): Promise<void> {
  const clipboard = Clipboard.get();
  const res = format(clipboard);

  if (!res) {
    return;
  }

  Logger.info(`Copied to clipboard: 
${res}`);
  Clipboard.add(res);
}
