import { R } from "@dev/util";

import { ArgSchema, isClipboardDefault } from "./args";

function formatShortFlag(
  short: string,
  name: string,
  info: ArgSchema[string],
): string {
  return R.isBooleanRuntype(info.type) ? `-${short}` : `-${short}=<${name}>`;
}

function formatLongFlag(name: string, info: ArgSchema[string]): string {
  return R.isBooleanRuntype(info.type) ? `--${name}` : `--${name}=<${name}>`;
}

function formatUsageArg(name: string, info: ArgSchema[string]): string {
  const long = formatLongFlag(name, info);
  if (info.short) {
    return `[${formatShortFlag(info.short, name, info)}|${long}]`;
  }
  return `[${long}]`;
}

function formatOptionName(name: string, info: ArgSchema[string]): string {
  const long = formatLongFlag(name, info);
  if (info.short) {
    return `-${info.short}, ${long}`;
  }
  return long;
}

function formatDefaultSuffix(info: ArgSchema[string]): string {
  if ("default" in info && info.default !== undefined) {
    if (isClipboardDefault(info.default)) {
      return " [default: clipboard]";
    }
    return ` [default: ${JSON.stringify(info.default)}]`;
  }
  return "";
}

export function formatHelp(scriptName: string, argSchema: ArgSchema): string {
  const entries = Object.entries(argSchema);
  const usageArgs = entries.map(([name, info]) => formatUsageArg(name, info));

  const optionNames = [
    ...entries.map(([name, info]) => formatOptionName(name, info)),
    "-h, --help",
  ];
  const optionWidth = Math.max(...optionNames.map((name) => name.length));

  const lines = [
    "",
    "Usage:",
    `  ${scriptName}${usageArgs.length > 0 ? ` ${usageArgs.join(" ")}` : ""}`,
    "",
    "Options:",
    ...entries.map(([name, info]) => {
      const optionName = formatOptionName(name, info);
      const desc =
        (typeof info.description === "string" ? info.description : "") +
        formatDefaultSuffix(info);
      return `  ${optionName.padEnd(optionWidth)}  ${desc}`;
    }),
    `  ${"-h, --help".padEnd(optionWidth)}  `,
  ];

  return lines.join("\n");
}
