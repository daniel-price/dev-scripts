import * as Logger from "../logger";
import { asQuery, attachQuery, ComposedQuery } from "./query-builder";
import {
  CommonOptions,
  constructWhere,
  prefixedTableName,
  SQL,
  sql,
} from "./util";

type DeleteOptions = CommonOptions;

export interface DeleteQuery extends ComposedQuery<DeleteQuery, void> {}

export function deleteAll(client: SQL, table: string): DeleteQuery {
  return asQuery<DeleteQuery>(new DeleteQueryImpl(client, table, {}));
}

class DeleteQueryImpl {
  constructor(
    private readonly client: SQL,
    private readonly table: string,
    private readonly options: DeleteOptions,
  ) {
    attachQuery(this, {
      options,
      recreate: (next) =>
        asQuery<DeleteQuery>(
          new DeleteQueryImpl(this.client, this.table, next),
        ),
      execute: () => deleteInternal(this.client, this.table, this.options),
    });
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
