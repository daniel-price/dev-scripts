import { withCommonQueryMethods } from "./query-builder";
import { CommonOptions, prefixedTableName, SQL, sql } from "./util";

type InsertOptions = CommonOptions;

interface InsertQuery extends PromiseLike<void> {
  tablePrefix(prefix: string): InsertQuery;
}

export function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
): InsertQuery {
  return createInsertQuery(client, table, items, {});
}

function createInsertQuery<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: InsertOptions,
): InsertQuery {
  return withCommonQueryMethods(
    options,
    (next) => createInsertQuery(client, table, items, next),
    () => insertInternal(client, table, items, options),
  );
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
