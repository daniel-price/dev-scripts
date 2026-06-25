import { Logger, R, Sql } from "@dev/util";

import { defineScript } from "./script";
import { getSqlClient } from "./util/getSqlClient";

export default defineScript({
  args: {
    table: {
      type: R.String,
      description: "The name of the RDS table to scan.",
    },
    stagePrefix: {
      type: R.String.optional(),
      description: "The stage prefix to filter the items by.",
    },
  },
  help: () => {
    return `This script scans a RDS table and logs the items.`;
  },
  run: async (args) => {
    const client = getSqlClient();
    const items = await Sql.select(client, args.table, R.Record({}), {
      stagePrefix: args.stagePrefix,
    });
    for (const item of items.records) {
      Logger.info("TableItems:", item);
    }
  },
});
