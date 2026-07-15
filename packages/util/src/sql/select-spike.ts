import * as R from "../runtypes";
import { queryThen } from "./query-builder";
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

export interface SelectQuery<T>
  extends PromiseLike<SelectResult<T>>,
    WithOptionMethods<SelectOptions, SelectQuery<T>> {}

function bindWithOptionMethods<
  TOptions extends Record<string, unknown>,
  TSelf,
  const Keys extends readonly (keyof TOptions & string)[],
>(
  options: Partial<TOptions>,
  recreate: (next: Partial<TOptions>) => TSelf,
  keys: Keys,
): Pick<
  WithOptionMethods<Pick<TOptions, Keys[number]>, TSelf>,
  `with${Capitalize<Keys[number]>}`
> {
  return Object.fromEntries(
    keys.map((key) => [
      `with${key[0].toUpperCase()}${key.slice(1)}`,
      (value: TOptions[typeof key]): TSelf =>
        recreate({ ...options, [key]: value }),
    ]),
  ) as unknown as Pick<
    WithOptionMethods<Pick<TOptions, Keys[number]>, TSelf>,
    `with${Capitalize<Keys[number]>}`
  >;
}

export function doTheThing<
  TResult,
  TOptions extends Record<string, unknown>,
  TSelf,
  const Keys extends readonly (keyof TOptions & string)[],
>(config: {
  execute: () => Promise<TResult>;
  optionKeys: Keys;
  options: Partial<TOptions>;
  recreate: (next: Partial<TOptions>) => TSelf;
}): PromiseLike<TResult> &
  Pick<
    WithOptionMethods<Pick<TOptions, Keys[number]>, TSelf>,
    `with${Capitalize<Keys[number]>}`
  > {
  const query = {} as PromiseLike<TResult> &
    Pick<
      WithOptionMethods<Pick<TOptions, Keys[number]>, TSelf>,
      `with${Capitalize<Keys[number]>}`
    >;

  void Object.assign(
    query,
    queryThen(config.execute),
    bindWithOptionMethods(config.options, config.recreate, config.optionKeys),
  );

  return query;
}

export function select2<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype.Core<T>,
  options: Partial<SelectOptions> = {},
): SelectQuery<T> {
  return doTheThing({
    execute: () =>
      selectInternal(client, table, runtype, options as SelectOptions),
    optionKeys,
    options,
    recreate: (next) => select2(client, table, runtype, next),
  });
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
