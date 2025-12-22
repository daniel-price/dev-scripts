import { DescribeExportCommandOutput } from "@aws-sdk/client-dynamodb";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

import { awsProxy } from "../helpers/awsProxy";

const client = awsProxy(new STSClient());

export async function assumeRole(
  roleArn: string,
): Promise<DescribeExportCommandOutput> {
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
