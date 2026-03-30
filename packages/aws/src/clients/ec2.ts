import {
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  DescribeVpcsCommandOutput,
  EC2Client,
  SecurityGroup,
  Subnet,
  Vpc,
} from "@aws-sdk/client-ec2";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getEC2Client = regionalAwsClient(EC2Client);

export async function describeVpcs(
  client: EC2Client,
  vpcName: string,
): Promise<Vpc[]> {
  const res: DescribeVpcsCommandOutput = await client.send(
    new DescribeVpcsCommand({
      Filters: [
        {
          Name: "tag:Name",
          Values: [vpcName],
        },
      ],
    }),
  );

  if (!res.Vpcs) {
    throw new Error(`Unable to describe vpc ${vpcName}`);
  }

  return res.Vpcs;
}

export async function describeSecurityGroups(
  client: EC2Client,
  vpcId: string,
): Promise<SecurityGroup[]> {
  const res = await client.send(
    new DescribeSecurityGroupsCommand({
      Filters: [
        {
          Name: "vpc-id",
          Values: [vpcId],
        },
      ],
    }),
  );

  if (!res.SecurityGroups) {
    throw new Error(`Unable to describe security groups for vpc ${vpcId}`);
  }

  return res.SecurityGroups;
}

export async function describeSubnets(
  client: EC2Client,
  vpcId: string,
): Promise<Subnet[]> {
  const res = await client.send(
    new DescribeSubnetsCommand({
      Filters: [
        {
          Name: "vpc-id",
          Values: [vpcId],
        },
      ],
    }),
  );

  if (!res.Subnets) {
    throw new Error(`Unable to describe subnets for vpc ${vpcId}`);
  }

  return res.Subnets;
}
