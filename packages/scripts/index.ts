import { Logger, Prompt } from "@dev/util";
import fs from "fs";
import mri from "mri";

import { buildMriOptions, parseArgs, pickSchemaArgs } from "./src/args";
import { getCleanedEnv } from "./src/env";
import { formatHelp } from "./src/help";
import { AnyScriptConfig } from "./src/script";

const scriptsDir = `${__dirname}/src/`;

process.on("SIGINT", () => {
  process.exit();
});

async function safeImport(file: string): Promise<AnyScriptConfig | null> {
  try {
    return (await import(scriptsDir + file)).default;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Cannot find module"))
      return null;
    throw e;
  }
}

async function main(): Promise<void> {
  let scriptName: string | undefined;

  try {
    const argv = process.argv.slice(2);
    const inputScript = mri(argv)._[0];

    const files = fs
      .readdirSync(scriptsDir)
      .filter(
        (file) =>
          !fs.statSync(`${scriptsDir}/${file}`).isDirectory() &&
          !file.endsWith(".spec.ts") &&
          file !== "index.ts",
      )
      .map((file) => file.replace(".ts", ""))
      .sort();

    const file = inputScript || (await Prompt.select("Select script", files));
    scriptName = file;
    const script = await safeImport(`./${file.replace(".ts", "")}`);
    if (!script) {
      Logger.error(`${file} is not a valid script`);
      return;
    }

    const mriOptions = buildMriOptions(script.args ?? {});
    const { _, ...rawArgs } = mri(argv, mriOptions);

    if (rawArgs.help) {
      Logger.info(formatHelp(file, script.args ?? {}));
      return;
    }

    const args = pickSchemaArgs(script.args ?? {}, rawArgs);
    const parsedArgs = await parseArgs(script.args || {}, args);

    const env = getCleanedEnv(script.env);

    await script.run(parsedArgs, env);
  } catch (e) {
    if (e instanceof Prompt.PromptCancelledError) {
      return;
    }
    Logger.error(
      scriptName
        ? `Failed to run script: ${scriptName}`
        : "Failed to run script",
      e,
    );
  }
}

void main();
