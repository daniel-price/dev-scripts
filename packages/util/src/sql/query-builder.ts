import * as R from "../runtypes";
import { CommonOptions, Wheres } from "./util";

export type TableQueryMethods<T> = {
  tablePrefix(prefix?: string): T;
  where(wheres: Wheres): T;
};

type TableQueryMethod = keyof TableQueryMethods<unknown>;

/** Add new common query methods here and on QueryState / TableQueryMethods. */
export const tableQueryMethods = [
  "tablePrefix",
  "where",
] as const satisfies ReadonlyArray<TableQueryMethod>;

export type ComposedQuery<
  TSelf,
  TResult,
  M extends readonly TableQueryMethod[] = typeof tableQueryMethods,
> = Pick<TableQueryMethods<TSelf>, M[number]> &
  Pick<PromiseLike<TResult>, "then">;

export type OptionMethods<
  TQuery,
  TOptions,
  Keys extends keyof TOptions & string,
  ToRuntypeQuery extends <U>(runtype: R.Runtype<U>) => unknown = <U>(
    _runtype: R.Runtype<U>,
  ) => TQuery,
> = {
  [K in Keys]: K extends "runtype"
    ? ToRuntypeQuery
    : (value: TOptions[K]) => TQuery;
};

export function asQuery<TQuery>(query: object): TQuery {
  return query as TQuery;
}

export class QueryState<TOptions extends CommonOptions, TSelf> {
  constructor(
    readonly options: TOptions,
    private readonly recreate: (next: TOptions) => TSelf,
  ) {}

  tablePrefix(prefix?: string): TSelf {
    return this.recreate({ ...this.options, tablePrefix: prefix });
  }

  where(wheres: Wheres): TSelf {
    return this.recreate({ ...this.options, wheres });
  }
}

export function bindQueryState<
  TOptions extends CommonOptions,
  TSelf,
  const M extends readonly TableQueryMethod[],
>(
  state: QueryState<TOptions, TSelf>,
  methods: M = tableQueryMethods as unknown as M,
): Pick<TableQueryMethods<TSelf>, M[number]> {
  return Object.fromEntries(
    methods.map((method) => [method, state[method].bind(state)]),
  ) as Pick<TableQueryMethods<TSelf>, M[number]>;
}

export function bindOptionMethods<
  TOptions,
  TQuery,
  const Keys extends readonly (keyof TOptions & string)[],
>(
  options: TOptions,
  recreate: (next: TOptions) => TQuery,
  keys: Keys,
): Pick<OptionMethods<TQuery, TOptions, Keys[number]>, Keys[number]> {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      (value: unknown): TQuery =>
        recreate({ ...options, [key]: value } as TOptions),
    ]),
  ) as Pick<OptionMethods<TQuery, TOptions, Keys[number]>, Keys[number]>;
}

export function queryThen<TResult>(
  execute: () => Promise<TResult>,
): Pick<PromiseLike<TResult>, "then"> {
  return {
    then<TResult1 = TResult, TResult2 = never>(
      onfulfilled?:
        | ((value: TResult) => TResult1 | PromiseLike<TResult1>)
        | null
        | undefined,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null
        | undefined,
    ): Promise<TResult1 | TResult2> {
      return execute().then(onfulfilled, onrejected);
    },
  };
}

export function attachQuery<
  TTarget extends object,
  TOptions extends CommonOptions,
  TSelf,
  TResult,
  const M extends readonly TableQueryMethod[],
  const OptionKeys extends readonly (keyof TOptions & string)[] = readonly [],
>(
  target: TTarget,
  config: {
    options: TOptions;
    recreate: (next: TOptions) => TSelf;
    execute: () => Promise<TResult>;
    methods?: M;
    optionKeys?: OptionKeys;
  },
): void {
  const state = new QueryState(config.options, config.recreate);
  void Object.assign(
    target,
    bindQueryState(state, config.methods),
    bindOptionMethods(
      config.options,
      config.recreate,
      config.optionKeys ?? [],
    ),
    queryThen(config.execute),
  );
}
