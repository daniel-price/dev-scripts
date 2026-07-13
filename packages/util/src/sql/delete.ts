import * as Logger from "../logger";
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

type DeleteOptions = CommonOptions;

export function deleteAll(client: SQL, table: string): DeleteQuery {
  return new DeleteQuery(client, table, {});
}

class DeleteQuery implements TableQueryMethods<DeleteQuery>, PromiseLike<void> {
  declare tablePrefix: QueryState<DeleteOptions, DeleteQuery>["tablePrefix"];
  declare where: QueryState<DeleteOptions, DeleteQuery>["where"];
  declare then: PromiseLike<void>["then"];

  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly options: DeleteOptions,
  ) {
    const state = new QueryState(
      options,
      (next) => new DeleteQuery(this.client, this.table, next),
    );
    void Object.assign(
      this,
      bindQueryState(state),
      queryThen(() => deleteInternal(this.client, this.table, this.options)),
    );
  }
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
