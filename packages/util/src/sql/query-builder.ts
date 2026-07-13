import { CommonOptions, Wheres } from "./util";

export type TableQueryMethods<T> = {
  tablePrefix(prefix?: string): T;
  where(wheres: Wheres): T;
};

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

export function bindQueryState<TOptions extends CommonOptions, TSelf>(
  state: QueryState<TOptions, TSelf>,
): TableQueryMethods<TSelf> {
  return {
    tablePrefix: state.tablePrefix.bind(state),
    where: state.where.bind(state),
  };
}
