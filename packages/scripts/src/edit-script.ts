import { Execute, FileUtil, Logger, R } from "@dev/util";
import { E_DIRECTORIES } from "@dev/util/src/file";

export const R_Args = R.Record({ name: R.String });

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const { name } = args;

  const filePath = `packages/scripts/src/${name}.ts`;

  const shouldCreate = FileUtil.fileExists(filePath, {
    directory: E_DIRECTORIES.DEV_SCRIPTS,
  });

  if (shouldCreate) {
    const fileContents = `import { Logger, R } from "@dev/util";

export const R_Args = R.Record({});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  Logger.info("Running ${name} script with args:", args);
}`;

    FileUtil.write(filePath, fileContents, {
      directory: E_DIRECTORIES.DEV_SCRIPTS,
    });

    Logger.info(`Created new script at ${filePath}`);
  }

  await Execute.openInEditor(filePath);
}
