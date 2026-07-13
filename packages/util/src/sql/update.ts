import {
  bindQueryState,
  QueryState,
  queryThen,
  TableQueryMethods,
} from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type UpdateOptions = CommonOptions;

export function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
): UpdateQuery {
  return new UpdateQuery(client, table, set, {});
}

class UpdateQuery implements TableQueryMethods<UpdateQuery>, PromiseLike<void> {
  declare tablePrefix: QueryState<UpdateOptions, UpdateQuery>["tablePrefix"];
  declare where: QueryState<UpdateOptions, UpdateQuery>["where"];
  declare then: PromiseLike<void>["then"];

  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly set: Record<string, unknown>,
    private readonly options: UpdateOptions,
  ) {
    const state = new QueryState(
      options,
      (next) => new UpdateQuery(this.client, this.table, this.set, next),
    );
    void Object.assign(
      this,
      bindQueryState(state),
      queryThen(() =>
        updateInternal(this.client, this.table, this.set, this.options),
      ),
    );
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
