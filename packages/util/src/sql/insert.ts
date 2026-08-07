import { composeWithOptionQuery, WithOptionMethods } from "./query-builder";
import { CommonOptions, prefixedTableName, SQL, sql } from "./util";

type InsertOptions = CommonOptions;

interface InsertQuery<T>
  extends PromiseLike<void>,
    WithOptionMethods<InsertOptions, InsertQuery<T>> {}

export function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: Partial<InsertOptions> = {},
): InsertQuery<T> {
  return composeWithOptionQuery(
    () => insertInternal(client, table, items, options),
    ["tablePrefix", "wheres"],
    options,
    (next) => insert(client, table, items, next),
  );
}

async function insertInternal<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: InsertOptions,
): Promise<void> {
  await client`
INSERT INTO ${sql(prefixedTableName(table, options))}
${sql(items)}`;
}
