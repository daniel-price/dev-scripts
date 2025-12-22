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

import { awsProxy } from "../helpers/awsProxy";

const ec2 = awsProxy(new EC2Client());

export async function describeVpcs(vpcName: string): Promise<Vpc[]> {
  const res: DescribeVpcsCommandOutput = await ec2.send(
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
  vpcId: string,
): Promise<SecurityGroup[]> {
  const res = await ec2.send(
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

export async function describeSubnets(vpcId: string): Promise<Subnet[]> {
  const res = await ec2.send(
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
