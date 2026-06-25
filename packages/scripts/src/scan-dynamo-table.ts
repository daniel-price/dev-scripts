import { DynamoDB } from "@dev/aws";
import { Logger, R } from "@dev/util";

import { defineScript } from "./script";

const R_TableItem = R.Record({
  id: R.String,
});

export default defineScript({
  args: {
    table: {
      type: R.String,
      description: "The name of the DynamoDB table to scan.",
    },
  },
  help: () => {
    return `This script scans a DynamoDB table and logs the items.`;
  },
  run: async (args, env) => {
    const dynamoClient = DynamoDB.getDynamoDBClient(env.AWS_REGION);
    const tableItemsGenerator = DynamoDB.scan(
      dynamoClient,
      args.table,
      R_TableItem,
    );

    let count = 0;
    for await (const item of tableItemsGenerator) {
      Logger.info(item);
      count++;
    }
    Logger.info(`Total items: ${count}`);
  },
});
