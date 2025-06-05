import * as csv from "csv/sync";
import fs from "fs";

import * as Json from "./json";
import * as Logger from "./logger";
import * as R from "./runtypes";

export enum E_DIRECTORIES {
  HOME = "/Users/daniel/",
  REPOS = "/Users/daniel/Repos/",
  DOWNLOADS = "/Users/daniel/Downloads/",
  DEV_SCRIPTS = "/Users/daniel/Repos/dev-scripts/",
  RESULTS = "/Users/daniel/Repos/dev-scripts/results/",
}

type Writable =
  | Record<string, unknown>
  | Array<Record<string, unknown> | string>
  | string
  | Map<string, unknown>;

type SharedOptions = {
  directory: E_DIRECTORIES | string;
};

type ReadOptions = SharedOptions;

type WriteOptions = SharedOptions & {
  append: boolean;
  includeTimestamp: boolean;
  prefix: string;
};

function getFilePath(fileName: string, options: WriteOptions): string {
  const timestamp = options.includeTimestamp
    ? `${new Date().toISOString()}_`
    : "";
  return `${options.directory}${timestamp}${options.prefix}${fileName}`;
}

function writeFile(
  fileName: string,
  contentString: string,
  options?: Partial<WriteOptions>,
): void {
  const allOptions: WriteOptions = {
    directory: E_DIRECTORIES.RESULTS,
    append: false,
    includeTimestamp: false,
    prefix: "",
    ...options,
  };
  const filePath = getFilePath(fileName, allOptions);

  if (allOptions.append) {
    fs.appendFileSync(filePath, `${contentString}\n`);
  } else {
    fs.writeFileSync(filePath, contentString);
  }

  Logger.info("Wrote to file", filePath);
}

export function writeCsv<T>(
  fileName: string,
  content: T[],
  options?: Partial<WriteOptions>,
): void {
  const contentString = csv.stringify(content, { header: true });

  writeFile(fileName, contentString, options);
}

export function write(
  fileName: string,
  content: Writable,
  options?: Partial<WriteOptions>,
): void {
  const contentString =
    typeof content === "string" ? content : Json.stringify(content);

  writeFile(fileName, contentString, options);
}

function read(fileName: string, options?: Partial<ReadOptions>): string {
  const allOptions: ReadOptions = {
    directory: E_DIRECTORIES.RESULTS,
    ...options,
  };
  const filePath = `${allOptions.directory}${fileName}`;
  return fs.readFileSync(filePath, "utf8");
}

export function readCsv<T>(
  fileName: string,
  runType: R.Runtype<T>,
  options?: Partial<ReadOptions>,
): Array<T> {
  const fileContent = read(fileName, options);
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    cast: true,
  });
  return R.assertType(R.Array(runType), records);
}

export function readJson<T>(
  fileName: string,
  runType: R.Runtype<T>,
  options?: Partial<ReadOptions> & { mapFn?: (line: string) => T },
): T {
  const fileContent = read(fileName, options);

  return Json.parse(fileContent, runType);
}

export function readLines<T>(
  fileName: string,
  runType: R.Runtype<T>,
  options?: Partial<ReadOptions> & { mapFn?: (line: string) => T },
): Array<T> {
  const fileContent = read(fileName, options);

  const lines = fileContent.split("\n").filter((l) => l !== "");
  const mappedLines = options?.mapFn ? lines.map(options.mapFn) : lines;
  return R.assertType(R.Array(runType), mappedLines);
}

export function createDirectory(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function createDirectories(...dirs: string[]): void {
  for (const d of dirs) {
    createDirectory(d);
  }
}

export function deleteFile(filePath: string): void {
  if (fileExists(filePath)) fs.unlinkSync(filePath);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function getFilesRecursively(filePath: string): string[] {
  const files = fs.readdirSync(filePath);
  return files.flatMap((f) => {
    const fullPath = `${filePath}/${f}`;
    if (fs.statSync(fullPath).isDirectory()) {
      return getFilesRecursively(fullPath);
    }
    return fullPath;
  });
}
