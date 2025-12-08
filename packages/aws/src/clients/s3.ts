import {
  _Object,
  Bucket,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ChangeItems, Logger, Util } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";

const s3 = new S3Client();

type Options = {
  skipPrompt: boolean;
};

export async function listObjectsInBucket(
  bucket: string,
  prefix?: string,
): Promise<_Object[]> {
  const res = await s3.send(
    new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }),
  );

  return res.Contents || [];
}

export async function getObject(bucket: string, key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  if (!res.Body) throw new Error("no body set!");
  return res.Body.transformToString();
}

export async function deleteBucket(
  bucket: string,
  options: { emptyFirst?: boolean; region?: string } & Partial<Options> = {},
): Promise<boolean> {
  try {
    Logger.info(`Deleting bucket ${bucket}...`);
    if (options.emptyFirst) {
      await emptyBucket(bucket, { skipPrompt: options.skipPrompt });
    }
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await s3.send(command);
    Logger.info(`Bucket ${bucket} deleted successfully.`);
    return true;
  } catch (e) {
    const handled = await handleRedirect(e, () =>
      deleteBucket(bucket, options),
    );
    if (handled) return true;

    Logger.error(`Error deleting bucket ${bucket}`, e);
    return false;
  }
}

async function handleRedirect(
  e: unknown,
  fn: () => Promise<unknown>,
): Promise<boolean> {
  let endpoint = "";

  if (
    e instanceof Error &&
    e.cause &&
    e.cause instanceof Error &&
    e.cause.name === "PermanentRedirect" &&
    Util.has(e.cause, "Endpoint") &&
    typeof e.cause.Endpoint === "string"
  ) {
    endpoint = e.cause.Endpoint;
  }

  if (
    e instanceof Error &&
    e.name === "PermanentRedirect" &&
    Util.has(e, "Endpoint") &&
    typeof e.Endpoint === "string"
  ) {
    endpoint = e.Endpoint;
  }

  if (!endpoint) {
    return false;
  }

  let region: string;
  if (endpoint === "s3.amazonaws.com") {
    region = "us-east-1";
  } else {
    const match = endpoint.match(/^.*s3[.-](.+)[.-]amazonaws\.com$/);
    if (match && match[1]) {
      region = match[1];
    } else {
      throw new Error("Could not parse region from endpoint", {
        cause: { endpoint },
      });
    }
  }
  const existingRegion = await s3.config.region();
  Logger.info("Changing from", existingRegion, "to ", region);
  s3.config.region = async (): Promise<string> => region;
  Logger.info("Retrying operation in new region...");
  await fn();
  Logger.info("Operation succeeded.");
  Logger.info("Changing back to from", region, "to ", existingRegion);
  s3.config.region = async (): Promise<string> => existingRegion;
  return true;
}

export async function deleteBuckets(
  bucketNames: string[],
  options: Parameters<typeof deleteBucket>[1] = {},
): Promise<void> {
  await changeItems("Delete buckets", bucketNames, (bucketName: string) =>
    deleteBucket(bucketName, options),
  );
}

export async function emptyBucket(
  bucket: string,
  options: Partial<Options> = {},
): Promise<boolean> {
  while (true) {
    try {
      Logger.info(`Deleting bucket ${bucket}...`);
      const objects = await listObjectsInBucket(bucket);
      Logger.info(`Found ${objects.length} objects in bucket ${bucket}.`);
      if (objects.length === 0) {
        Logger.info(`Bucket ${bucket} is already empty.`);
        return true;
      }

      await deleteObjects(
        bucket,
        objects.map(({ Key }) => {
          if (!Key) throw new Error("Key is not defined");
          return { Key };
        }),
        options,
      );
    } catch (e) {
      const handled = await handleRedirect(e, () =>
        emptyBucket(bucket, options),
      );
      if (handled) return true;

      throw new Error(`Error emptying ${bucket} bucket`, { cause: e });
    }
  }
}

export async function deleteObjects(
  bucket: string,
  objects: { Key: string }[],
  options: Partial<Options> = {},
): Promise<boolean> {
  if (!objects.length) {
    Logger.info(`no objects to delete in bucket ${bucket}`);
    return true;
  }
  if (!options.skipPrompt) {
    await ChangeItems.confirmChangeItems(
      `delete all objects (${objects.length}) in ${bucket}`,
      objects.map(({ Key }) => Key),
    );
  }

  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: objects },
  });
  await s3.send(command);

  return true;
}

export async function headObject(
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    return false;
  }
}

export async function listBuckets(): Promise<Bucket[]> {
  const result = await s3.send(new ListBucketsCommand({}));
  return result.Buckets || [];
}
