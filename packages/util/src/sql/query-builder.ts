import { CommonOptions, Wheres } from "./util";

export type TableQueryMethods<T> = {
  tablePrefix(prefix?: string): T;
  where(wheres: Wheres): T;
};

export function patch<TOptions extends CommonOptions, TSelf>(
  options: TOptions,
  recreate: (next: TOptions) => TSelf,
  update: Partial<CommonOptions>,
): TSelf {
  return recreate({ ...options, ...update });
}

export function withCommonQueryMethods<
  TSelf extends PromiseLike<TResult>,
  TOptions extends CommonOptions,
  TResult,
>(
  options: TOptions,
  recreate: (next: TOptions) => TSelf,
  execute: () => Promise<TResult>,
): TableQueryMethods<TSelf> & Pick<PromiseLike<TResult>, "then"> {
  return {
    tablePrefix(prefix?: string): TSelf {
      return patch(options, recreate, { tablePrefix: prefix });
    },

    where(wheres: Wheres): TSelf {
      return patch(options, recreate, { wheres });
    },

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
