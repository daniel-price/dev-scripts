import * as R from "../runtypes";
import { TableQueryMethods, withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  defaultRowRuntype,
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

export type SelectOptions<T = Record<string, unknown>> = CommonOptions & {
  runtype: R.Runtype<T>;
};

export function select(
  client: SQL,
  table: string,
): SelectQuery<Record<string, unknown>> {
  return createSelectQuery(client, table, { runtype: defaultRowRuntype });
}

interface SelectQuery<T>
  extends TableQueryMethods<SelectQuery<T>>,
    PromiseLike<SelectResult<T>> {
  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U>;
}

function createSelectQuery<T>(
  client: SQL,
  table: string,
  options: SelectOptions<T>,
): SelectQuery<T> {
  const recreate = <U>(next: SelectOptions<U>): SelectQuery<U> =>
    createSelectQuery(client, table, next);

  return Object.assign(
    withCommonQueryMethods(options, recreate, () =>
      selectInternal(client, table, options),
    ),
    {
      runtype<U>(runtype: R.Runtype<U>): SelectQuery<U> {
        return recreate({ ...options, runtype });
      },
    },
  );
}

async function selectInternal<T>(
  client: SQL,
  table: string,
  options: SelectOptions<T>,
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
    R.Record({
      records: R.Array(options.runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
}
