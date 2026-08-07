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

export function select2<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype.Core<T>,
  options: Partial<SelectOptions> = {},
): SelectQuery<T> {
  return composeWithOptionQuery(
    () => selectInternal(client, table, runtype, options),
    ["tablePrefix", "wheres"],
    options,
    (next) => select2(client, table, runtype, next),
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
  const result = {
    records: R.assertType(R.Array(runtype), rawResult),
    ...R.assertType(
      R.Object({
        count: R.Number,
        affectedRows: R.Nullable(R.Number),
        lastInsertRowid: R.Nullable(R.Number),
      }),
      rawResult,
    ),
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
