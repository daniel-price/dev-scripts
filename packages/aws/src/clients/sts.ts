import {
  AssumeRoleCommand,
  AssumeRoleCommandOutput,
  STSClient,
} from "@aws-sdk/client-sts";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getSTSClient = regionalAwsClient(STSClient);

export async function assumeRole(
  client: STSClient,
  roleArn: string,
): Promise<AssumeRoleCommandOutput> {
  const prefix = "danp-";
  const suffix = `-${Date.now().toString()}`;
  const roleName = roleArn.split("/")[1];
  if (!roleName)
    throw new Error(
      "Invalid roleArn - should be in format arn:aws:iam::XXXXXXXXX:role/YYYYYYY",
    );

  const roleSessionName = `${prefix}${roleName.substring(
    0,
    64 - prefix.length - suffix.length,
  )}${suffix}`;

  const response = await client.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: roleSessionName,
    }),
  );
  return response;
}
