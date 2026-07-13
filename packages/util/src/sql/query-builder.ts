import { CommonOptions } from "./util";

export type TableQueryMethods<T> = {
  tablePrefix(prefix: string): T;
};

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
    tablePrefix(tablePrefix: string): TSelf {
      return recreate({ ...options, tablePrefix });
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
