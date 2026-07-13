import { R } from "../..";
import { withCommonQueryMethods } from "./query-builder";
import {
  constructWhere,
  prefixedTableName,
  SelectOptions,
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

interface SelectQuery<T> extends PromiseLike<SelectResult<T>> {
  where(wheres: Wheres): SelectQuery<T>;
  stagePrefix(prefix: string): SelectQuery<T>;
  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U>;
}

export function select<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
): SelectQuery<T>;
export function select(
  client: SQL,
  table: string,
): SelectQuery<Record<string, unknown>>;
export function select(
  client: SQL,
  table: string,
  runtype?: R.Runtype<unknown>,
): SelectQuery<unknown> {
  return createSelectQuery(client, table, runtype ?? R.Record({}), {});
}

function createSelectQuery<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options: SelectOptions,
): SelectQuery<T> {
  const query = withCommonQueryMethods(
    options,
    (next) => createSelectQuery(client, table, runtype, next),
    () => selectInternal(client, table, runtype, options),
  );

  return Object.assign(query, {
    runtype<U>(newRuntype: R.Runtype<U>): SelectQuery<U> {
      return createSelectQuery(client, table, newRuntype, options);
    },
  });
}

async function selectInternal<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options: SelectOptions = {},
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
      records: R.Array(runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
}
