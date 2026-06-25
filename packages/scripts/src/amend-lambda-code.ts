import { Lambda } from "@dev/aws";
import {
  Execute,
  FileUtil,
  Http,
  Json,
  Logger,
  Prompt,
  R,
  SqlLite,
} from "@dev/util";

import { str } from "./env";
import { defineScript } from "./script";

export default defineScript({
  args: {
    functionName: {
      type: R.String,
      description: "Name of the Lambda function to amend.",
      short: "f",
    },

    dryRun: {
      type: R.Boolean.optional(),
      short: "d",
      description: "Run without making any changes.",
      default: false,
    },

    retries: {
      type: R.Number.optional(),
      description: "Number of retry attempts.",
    },
  },
  help: () => {
    return `This script allows you to amend the code of an AWS Lambda function.`;
  },
  env: {
    VS_CODE_DB_PATH: str({ default: "" }),
    DOWNLOAD_FOLDER: str(),
  },
  run: async (args, env) => {
    const { functionName } = args;
    const { VS_CODE_DB_PATH, DOWNLOAD_FOLDER } = env;

    await updateCode(functionName, DOWNLOAD_FOLDER);
    await removeFromRecentlyOpenedFiles(VS_CODE_DB_PATH, DOWNLOAD_FOLDER);
  },
});

async function updateCode(
  functionName: string,
  downloadFolder: string,
): Promise<void> {
  const lambda = Lambda.getLambdaClient();
  const functionNameWithDate = `${functionName}-${Date.now()}`;

  const res = await Lambda.getFunction(lambda, functionName);

  const codeUrl = res.Code?.Location;
  if (!codeUrl) {
    throw new Error(`Failed to get code URL for function ${functionName}`);
  }

  const zipsFolder = `${downloadFolder}/zips`;
  const codeFolder = `${downloadFolder}/code`;
  const unzippedFolder = `${codeFolder}/${functionNameWithDate}`;
  const zipFile = `${zipsFolder}/${functionNameWithDate}.zip`;
  const newZipFile = `${zipsFolder}/${functionNameWithDate}-new.zip`;

  FileUtil.createDirectories(
    downloadFolder,
    zipsFolder,
    codeFolder,
    unzippedFolder,
  );

  await Http.downloadFile(codeUrl, zipFile);

  Logger.info(`cd ${unzippedFolder} && unzip ${zipFile}`);
  await Execute.exec(`unzip ${zipFile}`, { cwd: unzippedFolder });

  const unzippedFolderPath = FileUtil.fileExists(`${unzippedFolder}/src`)
    ? `${unzippedFolder}/src`
    : unzippedFolder;
  const files = FileUtil.getFilesRecursively(unzippedFolderPath);
  const filePaths = files.filter((f) => f.match(/.*\.mjs$/));

  if (filePaths.length === 1) {
    const filePath = filePaths[0];

    await Execute.exec(`code ${filePath}`);
  } else {
    await Execute.exec(`code ${unzippedFolderPath}`);
  }
  await Execute.exec(`rm -rf .history`, { cwd: unzippedFolderPath });

  if (!(await Prompt.confirm("Do you want to update the code?"))) return;

  Logger.info("Zipping new code");

  await Execute.exec(`zip ${newZipFile} -r .`, { cwd: unzippedFolder });

  Logger.info("Uploading new code");
  await Lambda.updateFunctionCode(lambda, functionName, newZipFile);

  Logger.info("Uploaded new code");
}

async function removeFromRecentlyOpenedFiles(
  vsCodeDbPath: string,
  downloadPath: string,
): Promise<void> {
  if (!vsCodeDbPath) {
    Logger.info(
      "VS_CODE_DB_PATH is not set, skipping recently opened files cleanup.",
    );
    return;
  }
  const db = new SqlLite.Database(vsCodeDbPath);
  const typedResult = await SqlLite.select(
    db,
    "ItemTable",
    R.Record({ key: R.String, value: R.String }),
    { key: "history.recentlyOpenedPathsList" },
  );

  const parsedResult = Json.parse(
    typedResult.value,
    R.Record({
      entries: R.Array(
        R.Record({ folderUri: R.String }).Or(R.Record({ fileUri: R.String })),
      ),
    }),
  );

  parsedResult.entries = parsedResult.entries.filter((e) => {
    const folderOrFileUri = "folderUri" in e ? e.folderUri : e.fileUri;

    return !folderOrFileUri.includes(downloadPath);
  });

  const stringifiedResult = Json.stringify(parsedResult);

  SqlLite.update(
    db,
    "ItemTable",
    { value: stringifiedResult },
    { key: "history.recentlyOpenedPathsList" },
  );
}
