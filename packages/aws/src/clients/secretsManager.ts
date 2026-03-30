import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { Json, R } from "@dev/util";

import { awsProxy } from "../helpers/awsProxy";

const CLIENTS_BY_REGION: Record<string, SecretsManagerClient> = {};

export function getSecretsManagerClient(region: string): SecretsManagerClient {
  if (CLIENTS_BY_REGION[region]) return CLIENTS_BY_REGION[region];
  const client = awsProxy(new SecretsManagerClient({ region }));
  CLIENTS_BY_REGION[region] = client;
  return client;
}

export async function getStringSecret(
  client: SecretsManagerClient,
  secretId: string,
): Promise<string> {
  try {
    const res = await client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );

    if (!res.SecretString) throw new Error("no secret string set!");
    return res.SecretString;
  } catch (e) {
    const error = new Error("Error getting secret", {
      cause: {
        secretId,
        originalError: e,
      },
    });
    throw error;
  }
}

export async function getJsonSecret<T>(
  client: SecretsManagerClient,
  secretId: string,
  runtype: R.Runtype<T>,
): Promise<T> {
  const string = await getStringSecret(client, secretId);
  return Json.parse(string, runtype);
}
