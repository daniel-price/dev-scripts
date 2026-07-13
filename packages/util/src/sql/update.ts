import { bindQueryState, QueryState, TableQueryMethods } from "./query-builder";
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

  #client: SQL;
  #table: string;
  #set: Record<string, unknown>;
  #options: UpdateOptions;

  constructor(
    client: SQL,
    table: string,
    set: Record<string, unknown>,
    options: UpdateOptions,
  ) {
    this.#client = client;
    this.#table = table;
    this.#set = set;
    this.#options = options;

    const state = new QueryState(
      options,
      (next) => new UpdateQuery(client, table, set, next),
    );
    void Object.assign(this, bindQueryState(state));
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return updateInternal(
      this.#client,
      this.#table,
      this.#set,
      this.#options,
    ).then(onfulfilled, onrejected);
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
