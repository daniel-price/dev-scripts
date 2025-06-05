import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { Json, Logger, R } from "@dev/util";

const sm = new SecretsManagerClient();

export async function getStringSecret(secretId: string): Promise<string> {
  try {
    const res = await sm.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );

    if (!res.SecretString) throw new Error("no secret string set!");
    return res.SecretString;
  } catch (e) {
    Logger.error(`Error getting secret ${secretId}`, e);
    throw new Error("Error getting secret");
  }
}

export async function getJsonSecret<T>(
  secretId: string,
  runtype: R.Runtype<T>,
): Promise<T> {
  const string = await getStringSecret(secretId);
  return Json.parse(string, runtype);
}
