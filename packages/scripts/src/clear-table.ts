import { DynamoDB } from "@dev/aws";
import { Async, Logger, R, Util } from "@dev/util";

export const R_Args = R.Record({
  table: R.String,
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  Logger.info(`Clearing table ${args.table}`);

  const tableDescription = await DynamoDB.describeTable(args.table);
  const { ItemCount, KeySchema } = tableDescription;
  const keys = KeySchema?.map((k) => k.AttributeName).filter(Util.isNonNil);
  if (!keys) throw new Error(`Unable to find keys for table ${args.table}`);

  Logger.info(`Estimated item count: ${ItemCount}`);

  const scanGenerator = DynamoDB.scan(args.table, R.Dictionary(R.Unknown));

  const keysGenerator = Async.map(scanGenerator, (i) => Util.pickKeys(i, keys));

  await DynamoDB.deleteItems(args.table, keysGenerator, {
    skipPrompt: true,
    totalCount: ItemCount,
  });

  Logger.info(`Cleared table ${args.table}`);
}
