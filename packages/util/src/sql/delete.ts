import * as Logger from "../logger";
import { composeWithOptionQuery, WithOptionMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type DeleteOptions = CommonOptions;

interface DeleteQuery
  extends PromiseLike<void>,
    WithOptionMethods<DeleteOptions, DeleteQuery> {}

export function deleteAll(
  client: SQL,
  table: string,
  options: Partial<DeleteOptions> = {},
): DeleteQuery {
  return composeWithOptionQuery(
    () => deleteInternal(client, table, options),
    ["tablePrefix", "wheres"],
    options,
    (next) => deleteAll(client, table, next),
  );
}

async function deleteInternal(
  client: SQL,
  table: string,
  options: DeleteOptions,
): Promise<void> {
  const res = await client`
DELETE FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}`;
  Logger.info(`Deleted ${res.count} rows from ${table}`);
}
