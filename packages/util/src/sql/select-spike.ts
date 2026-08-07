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

type BunSqlResult<T> = T[] & {
  count: number;
  affectedRows: number | null;
  lastInsertRowid: number | null;
};

function bunSqlResultRuntype<T>(
  rowRuntype: R.Runtype.Core<T>,
): R.Runtype.Core<BunSqlResult<T>> {
  const arrayPart = R.Array(rowRuntype);
  const fieldsPart = R.Object({
    count: R.Number,
    affectedRows: R.Nullable(R.Number),
    lastInsertRowid: R.Nullable(R.Number),
  });

  return R.Unknown.withGuard(
    (value): value is BunSqlResult<T> =>
      arrayPart.guard(value) && fieldsPart.guard(value),
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

  const rawResultParsed = R.assertType(bunSqlResultRuntype(runtype), rawResult);

  const result = {
    records: Array.from(rawResultParsed),
    count: rawResultParsed.count,
    affectedRows: rawResultParsed.affectedRows,
    lastInsertRowid: rawResultParsed.lastInsertRowid,
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
