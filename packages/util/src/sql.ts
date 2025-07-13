import { SQL, sql as bunsql } from "bun";

import * as R from "./runtypes";

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
  options?: Partial<Options>,
): Promise<T[]> {
  const allOptions = setDefaultOptions(options);

  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, allOptions))}
`;
  const result = await query;

  return R.assertType(R.Array(runtype), result);
}

export async function deleteAll(
  client: SQL,
  table: string,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);

  const query = client`
DELETE FROM ${sql(prefixedTableName(table, allOptions))}
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

export async function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  wheres?: Record<string, unknown>,
  options?: Partial<Options>,
): Promise<void> {
  const allOptions = setDefaultOptions(options);
  const tableName = prefixedTableName(table, allOptions);
  const setEntries = Object.entries(set);
  const whereEntries = Object.entries(wheres || {});

  // Build SET clause: col1 = ${val1}, col2 = ${val2}
  const setFragments = setEntries.map(
    ([key, value]) => sql`${sql(key)} = ${value}`,
  );
  // Join with commas
  const setClause = setFragments.reduce((prev, curr, idx) =>
    idx === 0 ? curr : sql`${prev}, ${curr}`,
  );

  if (whereEntries.length > 0) {
    // Build WHERE clause: col1 = ${val1} AND col2 = ${val2}
    const whereFragments = whereEntries.map(
      ([key, value]) => sql`${sql(key)} = ${value}`,
    );
    const whereClause = whereFragments.reduce((prev, curr, idx) =>
      idx === 0 ? curr : sql`${prev} AND ${curr}`,
    );
    const query = client`UPDATE ${sql(tableName)} SET ${setClause} WHERE ${whereClause}`;
    await query;
  } else {
    const query = client`UPDATE ${sql(tableName)} SET ${setClause}`;
    await query;
  }
}
