import {
  _Object,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ChangeItems, Logger } from "@dev/util";

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

export async function deleteBucket(bucket: string): Promise<boolean> {
  try {
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await s3.send(command);
    Logger.info(`Bucket ${bucket} deleted successfully.`);
    return true;
  } catch (e) {
    Logger.error(`Error deleting bucket ${bucket}`, e);
    return false;
  }
}

export async function emptyBucket(
  bucket: string,
  options: Partial<Options> = {},
): Promise<boolean> {
  while (true) {
    try {
      const objects = await listObjectsInBucket(bucket);
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
  const result = await s3.send(command);
  Logger.info("deleteObjects result", result);

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
