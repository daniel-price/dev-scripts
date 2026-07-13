import * as Logger from "../logger";
import { withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
  Wheres,
} from "./util";

type DeleteOptions = CommonOptions;

interface DeleteQuery extends PromiseLike<void> {
  tablePrefix(prefix: string): DeleteQuery;
  where(wheres: Wheres): DeleteQuery;
}

export function deleteAll(client: SQL, table: string): DeleteQuery {
  return createDeleteQuery(client, table, {});
}

function createDeleteQuery(
  client: SQL,
  table: string,
  options: DeleteOptions,
): DeleteQuery {
  const updateOptions = (options: DeleteOptions): DeleteQuery =>
    createDeleteQuery(client, table, options);

  const query = withCommonQueryMethods(options, updateOptions, () =>
    deleteInternal(client, table, options),
  );
  return Object.assign(query, {
    where(wheres: Wheres): DeleteQuery {
      return updateOptions({ ...options, wheres });
    },
  });
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
