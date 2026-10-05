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

//of course needs changing, but rough idea...
// function tablePrefix(prefix?: string): TSelf {
//   return this.recreate({ ...this.options, tablePrefix: prefix });
// }

function tablePrefix<T>(options: T, prefix?: string): T {
  //
  return { ...options, tablePrefix: prefix };
}

function newComposeWithOptions(
  arg0: () => Promise<void>,
  arg1: ((prefix?: string) => void)[],
  options: Partial<CommonOptions>,
  arg3: (next: any) => UpdateQuery,
) {
  throw new Error("Function not implemented.");
}

export function update<T extends Record<string, unknown>>(
  client: SQL,
  table: string,
  set: T,
  options: Partial<UpdateOptions> = {},
): UpdateQuery {
  newComposeWithOptions(
    () => updateInternal(client, table, set, options),
    [tablePrefix],
    options,
    (next) => update(client, table, set, next),
  );

  return composeWithOptionQuery(
    () => updateInternal(client, table, set, options),
    //could we change this to e.g.
    //[tablePrefix, wheres]
    //so e.g. tablePrefix can be shared with different functions e.g. select,
    //but composeWithOptionQuery wouldn't need to know about the implementation
    //of tablePrefix?
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
