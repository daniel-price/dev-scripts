import * as R from "../runtypes";
import { asQuery, attachQuery, ComposedQuery } from "./query-builder";
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

export interface SelectQuery<T>
  extends ComposedQuery<SelectQuery<T>, SelectResult<T>> {
  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U>;
}

export function select(
  client: SQL,
  table: string,
): SelectQuery<Record<string, unknown>> {
  return asQuery<SelectQuery<Record<string, unknown>>>(
    new SelectQueryImpl(client, table, { runtype: defaultRowRuntype }),
  );
}

class SelectQueryImpl<T> {
  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly options: SelectOptions<T>,
  ) {
    attachQuery(this, {
      options,
      recreate: (next) =>
        asQuery<SelectQuery<T>>(
          new SelectQueryImpl(this.client, this.table, next),
        ),
      execute: () => selectInternal(this.client, this.table, this.options),
    });
  }

  runtype<U>(runtype: R.Runtype<U>): SelectQuery<U> {
    return asQuery<SelectQuery<U>>(
      new SelectQueryImpl(this.client, this.table, {
        ...this.options,
        runtype,
      }),
    );
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
