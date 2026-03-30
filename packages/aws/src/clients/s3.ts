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

function resolvedRegion(explicit?: string): string {
  const region =
    explicit ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error(
      "AWS region is required: pass `region` or set AWS_REGION / AWS_DEFAULT_REGION",
    );
  }
  return region;
}

type Options = {
  skipPrompt: boolean;
};

export async function listObjectsInBucket(
  bucket: string,
  prefix?: string,
  region?: string,
): Promise<_Object[]> {
  const res = await getS3Client(region).send(
    new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }),
  );

  return res.Contents || [];
}

export async function getObject(
  bucket: string,
  key: string,
  region?: string,
): Promise<string> {
  const res = await getS3Client(region).send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!res.Body) throw new Error("no body set!");
  return res.Body.transformToString();
}

export async function deleteBucket(
  bucket: string,
  options: { emptyFirst?: boolean; region?: string } & Partial<Options> = {},
): Promise<boolean> {
  const region = resolvedRegion(options.region);
  try {
    Logger.info(`Deleting bucket ${bucket}...`);
    if (options.emptyFirst) {
      await emptyBucket(bucket, { skipPrompt: options.skipPrompt, region });
    }
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await getS3Client(region).send(command);
    Logger.info(`Bucket ${bucket} deleted successfully.`);
    return true;
  } catch (e) {
    const handled = await handleRedirect(
      e,
      (r) => deleteBucket(bucket, { ...options, region: r }),
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
  bucketNames: string[],
  options: Parameters<typeof deleteBucket>[1] = {},
): Promise<void> {
  await changeItems("Delete buckets", bucketNames, (bucketName: string) =>
    deleteBucket(bucketName, options),
  );
}

export async function emptyBucket(
  bucket: string,
  options: Partial<Options> & { region?: string } = {},
): Promise<boolean> {
  const region = resolvedRegion(options.region);
  while (true) {
    try {
      Logger.info(`Deleting bucket ${bucket}...`);
      const objects = await listObjectsInBucket(bucket, undefined, region);
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
        { ...options, region },
      );
    } catch (e) {
      const handled = await handleRedirect(
        e,
        (r) => emptyBucket(bucket, { ...options, region: r }),
        region,
      );
      if (handled) return true;

      throw new Error(`Error emptying ${bucket} bucket`, { cause: e });
    }
  }
}

export async function deleteObjects(
  bucket: string,
  objects: { Key: string }[],
  options: Partial<Options> & { region?: string } = {},
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
  await getS3Client(options.region).send(command);

  return true;
}

export async function headObject(
  bucket: string,
  key: string,
  region?: string,
): Promise<boolean> {
  try {
    await getS3Client(region).send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return true;
  } catch (e) {
    return false;
  }
}

export async function listBuckets(region?: string): Promise<Bucket[]> {
  const result = await getS3Client(region).send(
    new ListBucketsCommand({}),
  );
  return result.Buckets || [];
}
