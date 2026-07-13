import * as R from "../runtypes";
import { withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  defaultRowRuntype,
  prefixedTableName,
  SQL,
  sql,
  Wheres,
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

interface SelectQuery<T> extends PromiseLike<SelectResult<T>> {
  where(wheres: Wheres): SelectQuery<T>;
  tablePrefix(prefix?: string): SelectQuery<T>;
  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U>;
}

export function select(
  client: SQL,
  table: string,
): SelectQuery<Record<string, unknown>> {
  return createSelectQuery(client, table, { runtype: defaultRowRuntype });
}

function createSelectQuery<T>(
  client: SQL,
  table: string,
  options: SelectOptions<T>,
): SelectQuery<T> {
  const updateOptions = <U>(options: SelectOptions<U>): SelectQuery<U> =>
    createSelectQuery(client, table, options);
  const query = withCommonQueryMethods(options, updateOptions, () =>
    selectInternal(client, table, options),
  );

  return Object.assign(query, {
    where(wheres: Wheres): SelectQuery<T> {
      return updateOptions({ ...options, wheres });
    },

    runtype<U>(runtype: R.Runtype<U>): SelectQuery<U> {
      return updateOptions({
        ...options,
        runtype,
      });
    },
  });
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
