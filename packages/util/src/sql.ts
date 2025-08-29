import { SQL, sql as bunsql } from "bun";

import * as R from "./runtypes";
import { Prettify } from "./types";

export const sql = bunsql;

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
  options?: Prettify<Partial<Options>>,
): Promise<T[]> {
  const allOptions = setDefaultOptions(options);

  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, allOptions))}
`;
  const result = await query;
  // Remove Bun-specific properties to avoid issues with type assertion
  delete result.count;
  delete result.command;
  delete result.lastInsertRowid;

  return R.assertType(R.Array(runtype), result);
}

export async function deleteAll(
  client: SQL,
  table: string,
  wheres?: Record<string, unknown>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  const query = client`
DELETE FROM ${sql(prefixedTableName(table, allOptions))}
${constructWhere(wheres)}
`;
  await query;
}

export async function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  const query = client`
INSERT INTO ${sql(prefixedTableName(table, allOptions))}
${sql(items)}
`;
  await query;
}

export async function update(
  client: SQL,
  table: string,
  set: Record<string, unknown>,
  wheres?: Record<string, unknown>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);
  const tableName = prefixedTableName(table, allOptions);

  const setClause = Object.entries(set)
    .map(([key, value]) => sql`${sql(key)} = ${value}`)
    .reduce((prev, curr, idx) => (idx === 0 ? curr : sql`${prev}, ${curr}`));

  const query = client`
UPDATE ${sql(tableName)} 
SET ${setClause} 
${constructWhere(wheres)}`;
  await query;
}

function constructWhere(
  wheres: Record<string, unknown> | undefined,
): Bun.SQLQuery {
  const whereEntries = Object.entries(wheres || {});
  return whereEntries.length
    ? sql`WHERE ${whereEntries
        .map(([key, value]) => sql`${sql(key)} = ${value}`)
        .reduce((prev, curr, idx) =>
          idx === 0 ? curr : sql`${prev} AND ${curr}`,
        )}`
    : sql``;
}
