import * as R from "../runtypes";
import {
  asQuery,
  attachQuery,
  ComposedQuery,
  OptionMethods,
  queryThen,
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

const optionKeys = [
  "tablePrefix",
  "wheres",
] as const satisfies readonly (keyof SelectOptions)[];

type SelectOptions = CommonOptions;

type WithOptionMethods<TOptions, TSelf> = {
  [K in keyof TOptions & string as `with${Capitalize<K>}`]: (
    value: TOptions[K],
  ) => TSelf;
};

type SelectQuery<T> = PromiseLike<SelectResult<T>> & {
  withWheres: (wheres: Record<string, unknown>) => SelectQuery<T>;
  withTablePrefix: (tablePrefix: string) => SelectQuery<T>;
};

export function doTheThing(then, optionFields) {
  return {
    ...queryThen(then),
    //... some more cleverness to get the withX methods
  };
}

export function select2<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype.Core<T>,
  options: Partial<SelectOptions> = {},
): SelectQuery<T> {
  return doTheThing(
    () => selectInternal(client, table, runtype, options),
    ["wheres", "tablePrefix"],
  );
  // return {
  //   ...queryThen(() => selectInternal(client, table, runtype, options)),
  //
  //   withWheres: (wheres) => {
  //     return select2(client, table, runtype, {
  //       ...options,
  //       wheres,
  //     });
  //   },
  //
  //   withTablePrefix: (tablePrefix) => {
  //     return select2(client, table, runtype, {
  //       ...options,
  //       tablePrefix,
  //     });
  //   },
  // };
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
