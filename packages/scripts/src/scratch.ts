import { FileUtil, Logger, R } from "@dev/util";

export async function main(): Promise<void> {
  Logger.info("This is a scratch file for testing purposes.");
  const _siteIds = FileUtil.readCsv(
    "output (1).txt",
    R.Record({
      id: R.String,
      practice_id: R.String,
    }),
    {
      directory: FileUtil.E_DIRECTORIES.DOWNLOADS,
    },
  );
}
