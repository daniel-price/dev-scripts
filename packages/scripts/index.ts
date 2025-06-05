import { Logger, Prompt, R } from "@dev/util";
import fs from "fs";
import mri from "mri";

const scriptsDir = `${__dirname}/src/`;

async function safeImport(file: string): Promise<{
  main: (args: Record<string, string>) => Promise<void>;
  help?: () => string;
  R_Args?: R.Record<{ [_: string]: R.RunTypeBase }, false>;
} | null> {
  try {
    return await import(scriptsDir + file);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Cannot find module"))
      return null;
    throw e;
  }
}

process.on("SIGINT", () => {
  process.exit();
});

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2);
    const { _, ...args } = mri(argv);

    const inputScript = _[0];
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
    const script = await safeImport(`./${file.replace(".ts", "")}`);
    if (!script) {
      Logger.error(`${file} is not a valid script`);
      return;
    }

    if (args.help) {
      const help = script.help ? script.help() : "No help specified";
      Logger.info(help);
      return;
    }

    if (script.R_Args) {
      const scriptArgNames = Object.entries(script.R_Args.fields);
      const requiredArgNames = scriptArgNames
        .filter(([_, fieldInfo]) => {
          return (
            ("tag" in fieldInfo && (fieldInfo.tag as string)) !== "optional"
          );
        })
        .map(([fieldName, _]) => fieldName);

      for (const requiredField of requiredArgNames) {
        if (!args[requiredField]) {
          args[requiredField] = await Prompt.string(`Enter ${requiredField}:`);
        }
      }

      R.assertType(script.R_Args, args);
    }

    await script.main(args);
  } catch (e) {
    if (e instanceof Prompt.PromptCancelledError) {
      return;
    }
    Logger.error("Error running script", e);
  }
}

void main();
