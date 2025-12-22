import { DescribeExportCommandOutput } from "@aws-sdk/client-dynamodb";
import { DescribeExecutionCommand, SFNClient } from "@aws-sdk/client-sfn";

import { awsProxy } from "../helpers/awsProxy";

const sfn = awsProxy(new SFNClient());

export async function describeExecution(
  executionArn: string,
): Promise<DescribeExportCommandOutput> {
  const response = await sfn.send(
    new DescribeExecutionCommand({ executionArn }),
  );
  return response;
}
