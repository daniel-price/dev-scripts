import * as Logger from "../logger";
import { TableQueryMethods, withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type DeleteOptions = CommonOptions;

interface DeleteQuery
  extends TableQueryMethods<DeleteQuery>,
    PromiseLike<void> {}

export function deleteAll(client: SQL, table: string): DeleteQuery {
  return createDeleteQuery(client, table, {});
}

function createDeleteQuery(
  client: SQL,
  table: string,
  options: DeleteOptions,
): DeleteQuery {
  return withCommonQueryMethods(
    options,
    (next) => createDeleteQuery(client, table, next),
    () => deleteInternal(client, table, options),
  );
}

export async function deleteInternal(
  client: SQL,
  table: string,
  options: DeleteOptions = {},
): Promise<void> {
  const query = client`
DELETE FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}
`;
  const res = await query;
  Logger.info(`Deleted ${res.count} rows from ${table}`);
  return res.count;
}
