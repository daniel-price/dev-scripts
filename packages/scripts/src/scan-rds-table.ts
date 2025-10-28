import { Logger, R, Sql } from "@dev/util";

import { getSqlClient } from "./util/getSqlClient";

export const R_Args = R.Record({
  table: R.String,
  stagePrefix: R.Optional(R.String),
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const client = getSqlClient();
  const items = await Sql.select(client, args.table, R.Record({}), {
    stagePrefix: args.stagePrefix,
  });
  for (const item of items.records) {
    Logger.info("TableItems:", item);
  }
}
