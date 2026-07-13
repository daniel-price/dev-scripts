import { asQuery, attachQuery, ComposedQuery } from "./query-builder";
import { CommonOptions, prefixedTableName, SQL, sql } from "./util";

type InsertOptions = CommonOptions;

export interface InsertQuery<T> extends ComposedQuery<InsertQuery<T>, void> {}

export function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
): InsertQuery<T> {
  return asQuery<InsertQuery<T>>(new InsertQueryImpl(client, table, items, {}));
}

class InsertQueryImpl<T> {
  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly items: Array<T>,
    private readonly options: InsertOptions,
  ) {
    attachQuery(this, {
      options,
      recreate: (next) =>
        asQuery<InsertQuery<T>>(
          new InsertQueryImpl(this.client, this.table, this.items, next),
        ),
      execute: () =>
        insertInternal(this.client, this.table, this.items, this.options),
    });
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
