import { QueryState } from "./query-builder";
import { CommonOptions, prefixedTableName, SQL, sql } from "./util";

type InsertOptions = CommonOptions;

export function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
): InsertQuery<T> {
  return new InsertQuery(client, table, items, {});
}

class InsertQuery<T> implements PromiseLike<void> {
  declare tablePrefix: QueryState<InsertOptions, InsertQuery<T>>["tablePrefix"];

  #client: SQL;
  #table: string;
  #items: Array<T>;
  #options: InsertOptions;

  constructor(
    client: SQL,
    table: string,
    items: Array<T>,
    options: InsertOptions,
  ) {
    this.#client = client;
    this.#table = table;
    this.#items = items;
    this.#options = options;

    const state = new QueryState(
      options,
      (next) => new InsertQuery(client, table, items, next),
    );
    void Object.assign(this, {
      tablePrefix: state.tablePrefix.bind(state),
    });
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return insertInternal(
      this.#client,
      this.#table,
      this.#items,
      this.#options,
    ).then(onfulfilled, onrejected);
  }
}

async function insertInternal<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: InsertOptions,
): Promise<void> {
  return await client`
INSERT INTO ${sql(prefixedTableName(table, options))}
${sql(items)}
`;
}
