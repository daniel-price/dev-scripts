import { S3 } from "@dev/aws";
import { Logger, R } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    bucketName: {
      type: R.String,
      description: "The name of the S3 bucket to empty and optionally delete.",
    },
    emptyOnly: {
      type: R.Boolean.optional(),
      description: "If true, only empty the bucket without deleting it.",
      default: false,
    },
  },
  help: () => {
    return `This script empties and optionally deletes an S3 bucket. Provide the bucket name as an argument using --bucketName. If you want to only empty the bucket without deleting it, use the --emptyOnly flag. For example: --bucketName my-bucket --emptyOnly`;
  },
  run: async (args) => {
    const { bucketName, emptyOnly } = args;
    const s3 = S3.getS3Client();

    Logger.info(
      `Emptying${emptyOnly ? "" : " and deleting"} s3 bucket`,
      bucketName,
    );

    await S3.emptyBucket(s3, bucketName, { skipPrompt: true });
    if (!emptyOnly) await S3.deleteBucket(s3, bucketName);
  },
});
