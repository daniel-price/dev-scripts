import { S3 } from "@dev/aws";
import { Logger, R } from "@dev/util";

export const R_Args = R.Record({
  bucketName: R.String,
  emptyOnly: R.Optional(R.Boolean),
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const { bucketName, emptyOnly } = args;
  Logger.info(
    `Emptying${emptyOnly ? "" : " and deleting"} s3 bucket`,
    bucketName,
  );
  await S3.emptyBucket(bucketName, { skipPrompt: true });
  if (!emptyOnly) await S3.deleteBucket(bucketName);
}
