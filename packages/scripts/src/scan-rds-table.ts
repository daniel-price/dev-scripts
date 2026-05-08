import { Logger, R, Sql } from "@dev/util";

import { getSqlClient } from "./util/getSqlClient";

export const R_Args = R.Record({
  table: R.String,
  stagePrefix: R.Optional(R.String),
});

export async function main(args: R.Static<typeof R_Args>): Promise<void> {
  const client = getSqlClient();
  const items = await Sql.select(client, args.table, R.Record({}), {
    stagePrefix: args.stagePrefix,
  });
  for (const item of items.records) {
    Logger.info("TableItems:", item);
  }
}
