import { SQL, sql as bunsql } from "bun";

import * as R from "./runtypes";

export const sql = bunsql;

type Options = {
  stagePrefix?: string;
};

function prefixedTableName(table: string, options: Options): string {
  return `${options.stagePrefix ? `${options.stagePrefix}_` : ""}${table}`;
}

export async function select<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options: Options = {},
): Promise<T[]> {
  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, options))}
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
  options: Options = {},
): Promise<void> {
  const query = client`
DELETE FROM ${sql(prefixedTableName(table, options))}
${constructWhere(wheres)}
`;
  await query;
}

export async function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: Partial<Options> = {},
): Promise<void> {
  const query = client`
INSERT INTO ${sql(prefixedTableName(table, options))}
${sql(items)}
`;
  await query;
}

export async function update(
  client: SQL,
  table: string,
  set: Record<string, unknown>,
  options: Options & { wheres?: Record<string, unknown> } = {},
): Promise<void> {
  const tableName = prefixedTableName(table, options);

  const setClause = Object.entries(set)
    .map(([key, value]) => sql`${sql(key)} = ${value}`)
    .reduce((prev, curr, idx) => (idx === 0 ? curr : sql`${prev}, ${curr}`));

  const query = client`
UPDATE ${sql(tableName)} 
SET ${setClause} 
${constructWhere(options.wheres)}`;
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
