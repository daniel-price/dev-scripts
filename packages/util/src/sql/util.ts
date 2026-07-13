//import sql and SQL from bun
import { SQL, sql } from "bun";

import * as R from "../runtypes";

export { SQL, sql };

export type Wheres = Record<string, unknown>;

export type CommonOptions = {
  stagePrefix?: string;
  wheres?: Wheres;
};

export const defaultRowRuntype =
  R.Record({}) as R.Runtype<Record<string, unknown>>;

export type SelectOptions<T = Record<string, unknown>> = CommonOptions & {
  runtype: R.Runtype<T>;
};

export function prefixedTableName(
  table: string,
  options: CommonOptions,
): string {
  return `${options.stagePrefix ? `${options.stagePrefix}_` : ""}${table}`;
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
