import { SQL, sql } from "bun";

import * as R from "../runtypes";

export { SQL, sql };

export type Wheres = Record<string, unknown>;

export type CommonOptions = {
  tablePrefix?: string;
  wheres?: Wheres;
};

export const defaultRowRuntype: R.Runtype.Core<Record<string, unknown>> =
  R.Record(R.String, R.Unknown);

export function prefixedTableName(
  table: string,
  options: CommonOptions,
): string {
  return `${options.tablePrefix ? `${options.tablePrefix}_` : ""}${table}`;
}

export function constructWhere(wheres?: Wheres): Bun.SQLQuery {
  const whereEntries = Object.entries(wheres || {});

  return whereEntries.length
    ? sql`WHERE ${whereEntries
        .map(([key, value]) => sql`${sql(key)} = ${value}`)
        .reduce((prev, curr, idx) =>
          idx === 0 ? curr : sql`${prev} AND ${curr}`,
        )}`
    : sql``;
}
