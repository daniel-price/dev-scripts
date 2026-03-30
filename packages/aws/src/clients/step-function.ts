import { DescribeExportCommandOutput } from "@aws-sdk/client-dynamodb";
import { DescribeExecutionCommand, SFNClient } from "@aws-sdk/client-sfn";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getSFNClient = regionalAwsClient(SFNClient);

export async function describeExecution(
  executionArn: string,
): Promise<DescribeExportCommandOutput> {
  const sfn = getSFNClient();
  const response = await sfn.send(
    new DescribeExecutionCommand({ executionArn }),
  );
  return response;
}
