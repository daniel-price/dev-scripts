import { withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
  Wheres,
} from "./util";

type UpdateOptions = CommonOptions;

interface UpdateQuery extends PromiseLike<void> {
  tablePrefix(prefix: string): UpdateQuery;
  where(wheres: Wheres): UpdateQuery;
}

export function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
): UpdateQuery {
  return createUpdateQuery(client, table, set, {});
}

function createUpdateQuery<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  options: UpdateOptions,
): UpdateQuery {
  const updateOptions = (options: UpdateOptions): UpdateQuery =>
    createUpdateQuery(client, table, set, options);
  const query = withCommonQueryMethods(
    options,
    (next) => createUpdateQuery(client, table, set, next),
    () => updateInternal(client, table, set, options),
  );

  return Object.assign(query, {
    where(wheres: Wheres): UpdateQuery {
      return updateOptions({ ...options, wheres });
    },
  });
}

export async function updateInternal(
  client: SQL,
  table: string,
  set: Record<string, unknown>,
  options: UpdateOptions = {},
): Promise<void> {
  const tableName = prefixedTableName(table, options);

  const setClause = Object.entries(set)
    .map(([key, value]) => sql`${sql(key)} = ${value}`)
    .reduce((prev, curr, idx) => (idx === 0 ? curr : sql`${prev}, ${curr}`));

  const query = client`
UPDATE ${sql(tableName)} 
SET ${setClause} 
${constructWhere(options.wheres)}`;
  await query;
}
