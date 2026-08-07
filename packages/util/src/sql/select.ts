import * as R from "../runtypes";
import { composeWithOptionQuery, WithOptionMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type SelectResult<T> = {
  records: T[];
  count: number;
  affectedRows: number | null;
  lastInsertRowid: number | null;
};

type SelectOptions = CommonOptions;

interface SelectQuery<T>
  extends PromiseLike<SelectResult<T>>,
    WithOptionMethods<SelectOptions, SelectQuery<T>> {}

export function select<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype.Core<T>,
  options: Partial<SelectOptions> = {},
): SelectQuery<T> {
  return composeWithOptionQuery(
    () => selectInternal(client, table, runtype, options),
    ["tablePrefix", "wheres"],
    options,
    (next) => select(client, table, runtype, next),
  );
}

async function selectInternal<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype.Core<T>,
  options: SelectOptions,
): Promise<SelectResult<T>> {
  const rawResult: unknown = await client`
SELECT *
FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}
`;

  const isExpectedShape =
    rawResult &&
    Array.isArray(rawResult) &&
    "count" in rawResult &&
    "affectedRows" in rawResult &&
    "lastInsertRowid" in rawResult;

  if (!isExpectedShape) {
    throw new Error(`Unexpected result shape from database query`, {
      cause: rawResult,
    });
  }

  const result = {
    records: Array.from(rawResult),
    count: rawResult.count,
    affectedRows: rawResult.affectedRows,
    lastInsertRowid: rawResult.lastInsertRowid,
  };

  return R.assertType(
    R.Object({
      records: R.Array(runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    result,
  );
}
