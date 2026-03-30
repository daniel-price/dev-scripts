import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  SFNClient,
} from "@aws-sdk/client-sfn";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getSFNClient = regionalAwsClient(SFNClient);

export async function describeExecution(
  client: SFNClient,
  executionArn: string,
): Promise<DescribeExecutionCommandOutput> {
  const response = await client.send(
    new DescribeExecutionCommand({ executionArn }),
  );
  return response;
}
