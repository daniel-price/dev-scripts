import { Clipboard, Json, Logger } from "@dev/util";

function format(str: string): string | null {
  let res = str
    .replaceAll("    +", "")
    .replaceAll(" Object ", "")
    .replaceAll(" Array ", "")
    .replaceAll("\\\\n", `\n`)
    .replaceAll("\\n", `\n`)
    .replaceAll(`\\\\"`, `"`)
    .replaceAll(`\\"`, `"`)
    //copied from SST logging
    .replaceAll(/\|/g, "")
    .replaceAll(/\+\d+ms/g, "");
  try {
    res = Json.stringify(JSON.parse(res));
  } catch (e) {}

  return res;
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
