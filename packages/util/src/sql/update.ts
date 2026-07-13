import { TableQueryMethods, withCommonQueryMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type UpdateOptions = CommonOptions;

interface UpdateQuery
  extends TableQueryMethods<UpdateQuery>,
    PromiseLike<void> {}

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
  return withCommonQueryMethods(
    options,
    (next) => createUpdateQuery(client, table, set, next),
    () => updateInternal(client, table, set, options),
  );
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
