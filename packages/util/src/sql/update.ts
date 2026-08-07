import { composeWithOptionQuery, WithOptionMethods } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type UpdateOptions = CommonOptions;

interface UpdateQuery
  extends PromiseLike<void>,
    WithOptionMethods<UpdateOptions, UpdateQuery> {}

export function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  options: Partial<UpdateOptions> = {},
): UpdateQuery {
  return composeWithOptionQuery(
    () => updateInternal(client, table, set, options),
    ["tablePrefix", "wheres"],
    options,
    (next) => update(client, table, set, next),
  );
}

async function updateInternal<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  options: UpdateOptions,
): Promise<void> {
  const setClause = Object.entries(set)
    .map(([key, value]) => sql`${sql(key)} = ${value}`)
    .reduce((prev, curr, idx) => (idx === 0 ? curr : sql`${prev}, ${curr}`));

  await client`
UPDATE ${sql(prefixedTableName(table, options))}
SET ${setClause}
${constructWhere(options.wheres)}`;
}
