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
import { cleanEnv, str } from "envalid";

export const R_Args = R.Record({
  functionName: R.String,
  functionNameOptionak: R.String.optional(),
});

type T_Args = R.Static<typeof R_Args>;

async function updateCode(
  functionName: string,
  downloadFolder: string,
): Promise<void> {
  const functionNameWithDate = `${functionName}-${Date.now()}`;

  const res = await Lambda.getFunction(functionName);

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
  await Execute.exec(`unzip ${zipFile}`, unzippedFolder);

  const files = FileUtil.getFilesRecursively(`${unzippedFolder}/src`);
  const filePath = files.find((f) => f.match(/.*\.mjs$/));

  await Execute.exec(`code ${filePath}`);

  if (!(await Prompt.confirm("Do you want to update the code?"))) return;

  Logger.info("Zipping new code");

  await Execute.exec(`trash .history`, unzippedFolder);
  await Execute.exec(`zip ${newZipFile} -r .`, unzippedFolder);

  Logger.info("Uploading new code");
  await Lambda.updateFunctionCode(functionName, newZipFile);

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

export async function main(args: T_Args): Promise<void> {
  const { VS_CODE_DB_PATH, DOWNLOAD_FOLDER } = cleanEnv(process.env, {
    VS_CODE_DB_PATH: str({ default: "" }),
    DOWNLOAD_FOLDER: str(),
  });

  await updateCode(args.functionName, DOWNLOAD_FOLDER);
  await removeFromRecentlyOpenedFiles(VS_CODE_DB_PATH, DOWNLOAD_FOLDER);
}
