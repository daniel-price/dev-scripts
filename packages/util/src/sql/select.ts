import * as R from "../runtypes";
import {
  asQuery,
  attachQuery,
  ComposedQuery,
  OptionMethods,
} from "./query-builder";
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

type SelectOptionFieldTypes<T> = {
  runtype: R.Runtype.Core<T>;
};

type SelectOptionKey = keyof SelectOptionFieldTypes<unknown> & string;

const selectOptionKeys = [
  "runtype",
] as const satisfies readonly SelectOptionKey[];

export type SelectOptions<T = Record<string, unknown>> = CommonOptions &
  Pick<SelectOptionFieldTypes<T>, SelectOptionKey>;

export interface SelectQuery<T>
  extends ComposedQuery<SelectQuery<T>, SelectResult<T>>,
    OptionMethods<
      SelectQuery<T>,
      SelectOptions<T>,
      SelectOptionKey,
      <U>(runtype: R.Runtype.Core<U>) => SelectQuery<U>
    > {}

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
      optionKeys: selectOptionKeys,
      recreate: (next) =>
        asQuery<SelectQuery<T>>(
          new SelectQueryImpl(this.client, this.table, next),
        ),
      execute: () => selectInternal(this.client, this.table, this.options),
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
    R.Object({
      records: R.Array(options.runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
}
