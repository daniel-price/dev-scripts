import { QueryState, queryThen } from "./query-builder";
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
  declare then: PromiseLike<void>["then"];

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
    }, queryThen(() =>
      insertInternal(this.#client, this.#table, this.#items, this.#options),
    ));
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
