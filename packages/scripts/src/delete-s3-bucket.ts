import { S3 } from "@dev/aws";
import { Logger, R } from "@dev/util";

export const R_Args = R.Record({
  bucketName: R.String,
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const { bucketName } = args;
  Logger.info("Deleting s3 bucket", bucketName);
  await S3.emptyBucket(bucketName, { skipPrompt: true });
  await S3.deleteBucket(bucketName);
}
