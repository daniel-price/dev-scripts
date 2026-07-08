import { Execute, FileUtil, Logger, R } from "@dev/util";
import { E_DIRECTORIES } from "@dev/util/src/file";

import { defineScript } from "./script";

export default defineScript({
  args: {
    name: { type: R.String, description: "The name of the script to edit." },
  },
  help: () => {
    return `This script edits a script in the scripts directory. If the script does not exist, it will be created.`;
  },
  run: async ({ name }) => {
    const filePath = `packages/scripts/src/${name}.ts`;

    const shouldCreate = !FileUtil.fileExists(filePath, {
      directory: E_DIRECTORIES.DEV_SCRIPTS,
    });

    if (shouldCreate) {
      const fileContents = `import { defineScript } from "./script";

import { Logger, R } from "@dev/util";

export default defineScript({
  args: {
    arg: {
      type: R.String.optional(),
      description: "An example argument.",
    },
  },
  help: () => {
    return "This is a new script. Edit the run function to add your logic.";
  },
  run: async ({arg}) => {
    Logger.info("Running ${name} script", arg);
  },
});`;

      FileUtil.write(filePath, fileContents, {
        directory: E_DIRECTORIES.DEV_SCRIPTS,
      });

      Logger.info(`Created new script at ${filePath}`);
    }

    await Execute.openInEditor(filePath);
  },
});
