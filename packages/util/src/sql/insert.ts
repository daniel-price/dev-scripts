import { bindTablePrefix, QueryState, queryThen } from "./query-builder";
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

  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly items: Array<T>,
    private readonly options: InsertOptions,
  ) {
    const state = new QueryState(
      options,
      (next) => new InsertQuery(this.client, this.table, this.items, next),
    );
    void Object.assign(
      this,
      bindTablePrefix(state),
      queryThen(() =>
        insertInternal(this.client, this.table, this.items, this.options),
      ),
    );
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
