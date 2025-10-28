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
): Promise<{
  records: T[];
  count: number;
  affectedRows: number | null;
  lastInsertRowid: number | null;
}> {
  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, options))}
`;
  const result = await query;
  if (!(result && typeof result === "object")) {
    throw new Error("Unexpected result from database query");
  }
  const records = Object.keys(result)
    .filter((k) => !isNaN(Number(k)))
    .map((key) => {
      return result[key];
    });

  const finalResult = {
    records,
    count: result.count,
    affectedRows: result.affectedRows,
    lastInsertRowid: result.lastInsertRowid,
  };

  return R.assertType(
    R.Record({
      records: R.Array(runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
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
  // const result = await query;

  // const res = extractPropertiesFromArray(
  //   result,
  //   R.Record({
  //     count: R.Number,
  //     command: R.String,
  //     lastInsertRowid: R.Nullable(R.Number),
  //     affectedRows: R.Nullable(R.Number),
  //   }) as const,
  // );

  await query;
}

// function extractPropertiesFromArray<
//   T extends string,
//   V extends string | number,
// >(
//   a: unknown,
//   additionalPropertiesRuntype: R.Record<T, V>,
// ): {
//   records: unknown[];
// } & { [K in T]: unknown } {
//   if (!Array.isArray(a)) {
//     throw new Error("Cannot extract properties from non-array or empty array");
//   }
//
//   const result = Object.keys(a).reduce(
//     (prev, curr) => {
//       if (!isNaN(Number(curr))) {
//         prev.records.push((a as any)[curr]);
//       } else if (properties.includes(curr)) {
//         prev[curr] = (a as any)[curr];
//       } else {
//         Logger.warn(`Unexpected property in SQL result: ${curr}`);
//       }
//       return prev;
//     },
//     { records: new Array<unknown>() },
//   );
//
//   return R.assertType(
//     R.Record({
//       records: R.Array(R.Unknown),
//     }).And(
//       R.Partial(
//         properties.reduce(
//           (acc, prop) => {
//             acc[prop] = R.Unknown;
//             return acc;
//           },
//           {} as Record<T, R.Runtype<unknown>>,
//         ),
//       ),
//     ),
//     result,
//   );
// }

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
