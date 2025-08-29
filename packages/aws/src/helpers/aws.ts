import { Json, Logger, R, retry } from "@dev/util";
import { execute } from "@getvim/execute";

export async function awsJSON<T>(
  runtype: R.Runtype<T>,
  ...args: string[]
): Promise<T[]> {
  const commandWithArgs = ["aws", ...args].join(" ");
  Logger.debug("awsJSON: commandWithArgs", commandWithArgs);
  const result = Json.parseArray(await execute(commandWithArgs), runtype);

  return result;
}

export async function aws(...args: string[]): Promise<string> {
  const commandWithArgs = ["aws", ...args].join(" ");
  const result = await execute(commandWithArgs);
  return result;
}

export function queryArg(queries?: string[]): string {
  if (!queries?.length) {
    return "";
  }

  return `?${queries.join(" && ")}`;
}

export function getQueryArg(
  queries: string[] | undefined,
  arrayName: string,
  fieldNames?: string | string[],
): string {
  if (!queries?.length) {
    return "";
  }

  const fieldNameString = getFieldNameString(fieldNames);

  return `--query '${arrayName}[${queryArg(queries)}]${fieldNameString}'`;
}

function getFieldNameString(fieldNames?: string | string[]): string {
  if (!fieldNames) return "";

  if (Array.isArray(fieldNames)) {
    const duplicated = fieldNames.map((f) => `${f}:${f}`).join(",");
    return `.{${duplicated}}`;
  }

  return `.${fieldNames}`;
}

export async function getAll<Result, Token>(
  fn: (
    token?: Token,
  ) => Promise<{ results?: Result[]; nextToken: Token | undefined }>,
  token?: Token,
): Promise<Result[]> {
  const allResults = [];
  let nextToken = token;
  do {
    const res = await retry(() => fn(nextToken));
    nextToken = res.nextToken;
    const { results = [] } = res;
    allResults.push(...results);
  } while (nextToken);
  return allResults;
}

export async function* yieldAll<Result, Token>(
  fn: (
    token?: Token,
  ) => Promise<{ results?: Result[]; nextToken: Token | undefined }>,
  token?: Token,
): AsyncGenerator<Result> {
  let nextToken = token;
  do {
    const res = await retry(() => fn(nextToken));
    nextToken = res.nextToken;
    const { results = [] } = res;

    for (const result of results) {
      yield result;
    }
  } while (nextToken);
}
