import { asQuery, attachQuery, ComposedQuery } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type UpdateOptions = CommonOptions;

export interface UpdateQuery extends ComposedQuery<UpdateQuery, void> {}

export function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
): UpdateQuery {
  return asQuery<UpdateQuery>(new UpdateQueryImpl(client, table, set, {}));
}

class UpdateQueryImpl {
  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly set: Record<string, unknown>,
    private readonly options: UpdateOptions,
  ) {
    attachQuery(this, {
      options,
      recreate: (next) =>
        asQuery<UpdateQuery>(
          new UpdateQueryImpl(this.client, this.table, this.set, next),
        ),
      execute: () =>
        updateInternal(this.client, this.table, this.set, this.options),
    });
  }
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
