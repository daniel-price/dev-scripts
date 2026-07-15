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

const select2OptionKeys = [
  "tablePrefix",
  "wheres",
] as const satisfies readonly (keyof SelectOptions)[];

export interface SelectQuery<T>
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
    select2OptionKeys,
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
  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}
`;

  const result = await query;

  if (!(result && typeof result === "object")) {
    throw new Error("Unexpected result from database query");
  }

  const records = Object.keys(result)
    .filter((k) => !isNaN(Number(k)))
    .map((key) => result[key]);

  const finalResult = {
    records,
    count: result.count,
    affectedRows: result.affectedRows,
    lastInsertRowid: result.lastInsertRowid,
  };

  return R.assertType(
    R.Object({
      records: R.Array(runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
}
