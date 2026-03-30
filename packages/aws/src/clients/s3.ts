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

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getS3Client = regionalAwsClient(S3Client);

type Options = {
  skipPrompt: boolean;
};

async function resolveS3ClientRegion(client: S3Client): Promise<string> {
  const r = client.config.region;
  if (r === undefined) {
    throw new Error(
      "S3 client has no region: use getS3Client(region) with a resolved region",
    );
  }
  return typeof r === "function" ? await r() : r;
}

export async function listObjectsInBucket(
  client: S3Client,
  bucket: string,
  prefix?: string,
): Promise<_Object[]> {
  const res = await client.send(
    new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }),
  );

  return res.Contents || [];
}

export async function getObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string> {
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!res.Body) throw new Error("no body set!");
  return res.Body.transformToString();
}

export async function deleteBucket(
  client: S3Client,
  bucket: string,
  options: { emptyFirst?: boolean } & Partial<Options> = {},
): Promise<boolean> {
  const region = await resolveS3ClientRegion(client);
  try {
    Logger.info(`Deleting bucket ${bucket}...`);
    if (options.emptyFirst) {
      await emptyBucket(client, bucket, { skipPrompt: options.skipPrompt });
    }
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await client.send(command);
    Logger.info(`Bucket ${bucket} deleted successfully.`);
    return true;
  } catch (e) {
    const handled = await handleRedirect(
      e,
      (r) => deleteBucket(getS3Client(r), bucket, options),
      region,
    );
    if (handled) return true;

    Logger.error(`Error deleting bucket ${bucket}`, e);
    return false;
  }
}

async function handleRedirect(
  e: unknown,
  retry: (region: string) => Promise<unknown>,
  attemptedRegion: string,
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

  if (region === attemptedRegion) {
    return false;
  }

  Logger.info("Changing from", attemptedRegion, "to ", region);
  Logger.info("Retrying operation in new region...");
  await retry(region);
  Logger.info("Operation succeeded.");
  return true;
}

export async function deleteBuckets(
  client: S3Client,
  bucketNames: string[],
  options: Parameters<typeof deleteBucket>[2] = {},
): Promise<void> {
  await changeItems("Delete buckets", bucketNames, (bucketName: string) =>
    deleteBucket(client, bucketName, options),
  );
}

export async function emptyBucket(
  client: S3Client,
  bucket: string,
  options: Partial<Options> = {},
): Promise<boolean> {
  const region = await resolveS3ClientRegion(client);
  while (true) {
    try {
      Logger.info(`Deleting bucket ${bucket}...`);
      const objects = await listObjectsInBucket(client, bucket, undefined);
      Logger.info(`Found ${objects.length} objects in bucket ${bucket}.`);
      if (objects.length === 0) {
        Logger.info(`Bucket ${bucket} is already empty.`);
        return true;
      }

      await deleteObjects(
        client,
        bucket,
        objects.map(({ Key }) => {
          if (!Key) throw new Error("Key is not defined");
          return { Key };
        }),
        options,
      );
    } catch (e) {
      const handled = await handleRedirect(
        e,
        (r) => emptyBucket(getS3Client(r), bucket, options),
        region,
      );
      if (handled) return true;

      throw new Error(`Error emptying ${bucket} bucket`, { cause: e });
    }
  }
}

export async function deleteObjects(
  client: S3Client,
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
  await client.send(command);

  return true;
}

export async function headObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    return false;
  }
}

export async function listBuckets(client: S3Client): Promise<Bucket[]> {
  const result = await client.send(new ListBucketsCommand({}));
  return result.Buckets || [];
}
