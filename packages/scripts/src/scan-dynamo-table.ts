import { DynamoDB } from "@dev/aws";
import { Logger, R } from "@dev/util";

export const R_Args = R.Record({
  table: R.String,
});

type T_Args = R.Static<typeof R_Args>;

const R_TableItem = R.Record({
  id: R.String,
});

export async function main(args: T_Args): Promise<void> {
  const dynamoClient = DynamoDB.getDynamoDBClient();
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
}
