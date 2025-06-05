import { DescribeExportCommandOutput } from "@aws-sdk/client-dynamodb";
import { DescribeExecutionCommand, SFNClient } from "@aws-sdk/client-sfn";

const sfn = new SFNClient();

export async function describeExecution(
  executionArn: string,
): Promise<DescribeExportCommandOutput> {
  const response = await sfn.send(
    new DescribeExecutionCommand({ executionArn }),
  );
  return response;
}
