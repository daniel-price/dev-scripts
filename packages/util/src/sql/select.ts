import * as R from "../runtypes";
import { bindQueryState, QueryState, queryThen, TableQueryMethods } from "./query-builder";
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
  return new SelectQuery(client, table, { runtype: defaultRowRuntype });
}

class SelectQuery<T>
  implements TableQueryMethods<SelectQuery<T>>, PromiseLike<SelectResult<T>>
{
  declare tablePrefix: QueryState<
    SelectOptions<T>,
    SelectQuery<T>
  >["tablePrefix"];
  declare where: QueryState<SelectOptions<T>, SelectQuery<T>>["where"];
  declare then: PromiseLike<SelectResult<T>>["then"];

  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly options: SelectOptions<T>,
  ) {
    const state = new QueryState(
      options,
      (next) => new SelectQuery(this.client, this.table, next),
    );
    void Object.assign(
      this,
      bindQueryState(state),
      queryThen(() => selectInternal(this.client, this.table, this.options)),
    );
  }

  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U> {
    return new SelectQuery(this.client, this.table, {
      ...this.options,
      runtype,
    });
  }
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
