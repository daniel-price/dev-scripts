import { R } from "../..";
import { withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
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

type RowType<O extends SelectOptions<unknown>> = O extends {
  runtype: R.Runtype<infer T>;
}
  ? T
  : Record<string, unknown>;

function optionsHaveRuntype<O extends SelectOptions<unknown>>(
  options: O,
): options is O & { runtype: R.Runtype<RowType<O>> } {
  return options.runtype !== undefined;
}

interface SelectQuery<T> extends PromiseLike<SelectResult<T>> {
  where(wheres: Wheres): SelectQuery<T>;
  stagePrefix(prefix: string): SelectQuery<T>;
  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U>;
}

export function select(
  client: SQL,
  table: string,
): SelectQuery<Record<string, unknown>> {
  return createSelectQuery(client, table, {});
}

function createSelectQuery<O extends SelectOptions<unknown>>(
  client: SQL,
  table: string,
  options: O = {} as O,
): SelectQuery<RowType<O>> {
  const query = withCommonQueryMethods(
    options,
    (next) => createSelectQuery(client, table, next),
    () => selectInternal(client, table, options),
  );

  return Object.assign(query, {
    runtype<U>(newRuntype: R.Runtype<U>): SelectQuery<U> {
      return createSelectQuery(client, table, {
        ...options,
        runtype: newRuntype,
      });
    },
  });
}

async function selectInternal<O extends SelectOptions<unknown>>(
  client: SQL,
  table: string,
  options: O,
): Promise<SelectResult<RowType<O>>> {
  if (optionsHaveRuntype(options)) {
    return selectWithRuntype(client, table, options.runtype, options);
  }

  return selectWithoutRuntype(client, table, options);
}

async function selectWithoutRuntype<O extends SelectOptions<unknown>>(
  client: SQL,
  table: string,
  options: O,
): Promise<SelectResult<RowType<O>>> {
  const finalResult = await fetchRawSelectResult(client, table, options);

  return R.assertType(
    R.Record({
      records: R.Array(R.Record({})),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  ) as SelectResult<RowType<O>>;
}

async function selectWithRuntype<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options: SelectOptions<T> = {},
): Promise<SelectResult<T>> {
  const finalResult = await fetchRawSelectResult(client, table, options);

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

async function fetchRawSelectResult(
  client: SQL,
  table: string,
  options: CommonOptions,
): Promise<{
  records: unknown[];
  count: number;
  affectedRows: number | null;
  lastInsertRowid: number | null;
}> {
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

  return {
    records,
    count: result.count,
    affectedRows: result.affectedRows,
    lastInsertRowid: result.lastInsertRowid,
  };
}
