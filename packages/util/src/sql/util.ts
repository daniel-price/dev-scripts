//import sql and SQL from bun
import { SQL, sql } from "bun";

import type { Runtype } from "../runtypes";

export { SQL, sql };

export type Wheres = Record<string, unknown>;

export type CommonOptions = {
  stagePrefix?: string;
  wheres?: Wheres;
};

export type SelectOptions<T = Record<string, unknown>> = CommonOptions & {
  runtype?: Runtype<T>;
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
