import { SQL, sql } from "bun";

import * as R from "./runtypes";
import * as Types from "./types";

type Options = {
  stagePrefix?: string;
};

function prefixedTableName(table: string, options: Options): string {
  return `${options.stagePrefix ? `${options.stagePrefix}_` : ""}${table}`;
}

function setDefaultOptions(options?: Partial<Options>): Options {
  return {
    ...options,
  };
}

export async function select<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options?: Partial<Options>,
): Promise<T[]> {
  const allOptions = setDefaultOptions(options);

  const result = await client`
SELECT *
FROM ${sql(prefixedTableName(table, allOptions))}
`;

  return R.assertType(R.Array(runtype), result);
}

export async function deleteKeys<T>(
  client: SQL,
  table: string,
  items: Array<Types.SingleKeyObject<T>>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  await client`
DELETE FROM ${sql(prefixedTableName(table, allOptions))}
WHERE id IN ${sql(items)}
`;
}

export async function deleteWhere(
  client: SQL,
  table: string,
  where: string,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  await client`
DELETE FROM ${sql(prefixedTableName(table, allOptions))}
${where ? `WHERE ${sql(where)}` : ""}
`;
}

export async function deleteAll(
  client: SQL,
  table: string,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  await client`
DELETE FROM ${sql(prefixedTableName(table, allOptions))}
`;
}

export async function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  await client`
INSERT INTO ${sql(prefixedTableName(table, allOptions))}
${sql(items)}
`;
}

export async function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  where: string,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  await client`
UPDATE ${sql(prefixedTableName(table, allOptions))} SET ${sql(set)} WHERE 1 = 1
`;
}
