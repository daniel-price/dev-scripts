import { DynamoDB } from "@dev/aws";
import { Async, Logger, R, Util } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    table: {
      type: R.String,
      description: "The name of the DynamoDB table to clear.",
    },
  },
  help: () => {
    return `This script clears all items from a specified DynamoDB table. It scans the table for all items, retrieves their keys, and deletes them in batches. Use with caution, as this action is irreversible.`;
  },
  run: async (args) => {
    Logger.info(`Clearing table ${args.table}`);

    const dynamoClient = DynamoDB.getDynamoDBClient();
    const tableDescription = await DynamoDB.describeTable(
      dynamoClient,
      args.table,
    );
    const { ItemCount, KeySchema } = tableDescription;
    const keys = KeySchema?.map((k) => k.AttributeName).filter(Util.isNonNil);
    if (!keys) throw new Error(`Unable to find keys for table ${args.table}`);

    Logger.info(`Estimated item count: ${ItemCount}`);

    const scanGenerator = DynamoDB.scan(
      dynamoClient,
      args.table,
      R.Dictionary(R.Unknown),
    );

    const keysGenerator = Async.map(scanGenerator, (i) =>
      Util.pickKeys(i, keys),
    );

    await DynamoDB.deleteItems(dynamoClient, args.table, keysGenerator, {
      skipPrompt: true,
      totalCount: ItemCount,
    });

    Logger.info(`Cleared table ${args.table}`);
  },
});
