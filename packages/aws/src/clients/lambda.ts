import {
  DeleteFunctionCommand,
  FunctionConfiguration,
  GetFunctionCommand,
  GetFunctionCommandOutput,
  InvokeCommand,
  InvokeCommandOutput,
  LambdaClient,
  ListFunctionsCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionCodeCommandOutput,
} from "@aws-sdk/client-lambda";
import { Json } from "@dev/util";
import { confirmChangeItems } from "@dev/util/src/change-items";
import fs from "fs";

import { yieldAll } from "../helpers/aws";
import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getLambdaClient = regionalAwsClient(LambdaClient);

export function listLambdaFunctions(): AsyncGenerator<FunctionConfiguration> {
  const lambda = getLambdaClient();
  return yieldAll(async (nextToken?: string) => {
    const res = await lambda.send(
      new ListFunctionsCommand({ Marker: nextToken }),
    );
    return { results: res.Functions, nextToken: res.NextMarker };
  });
}

export async function invoke(
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<InvokeCommandOutput> {
  const lambda = getLambdaClient();
  const payloadString = payload
    ? Buffer.from(Json.stringify(payload), "utf8")
    : undefined;
  return await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: payloadString,
    }),
  );
}

export async function getFunction(
  functionName: string,
): Promise<GetFunctionCommandOutput> {
  const lambda = getLambdaClient();
  const res = await lambda.send(
    new GetFunctionCommand({
      FunctionName: functionName,
    }),
  );

  return res;
}

export async function updateFunctionCode(
  functionName: string,
  zipFile: string,
): Promise<UpdateFunctionCodeCommandOutput> {
  const lambda = getLambdaClient();
  return await lambda.send(
    new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: fs.readFileSync(zipFile),
      Publish: true,
    }),
  );
}

export async function deleteLambdaFunctions(fnNames: string[]): Promise<void> {
  const lambda = getLambdaClient();
  await confirmChangeItems("delete Lambda functions", fnNames);
  for (const fnName of fnNames) {
    await lambda.send(
      new DeleteFunctionCommand({
        FunctionName: fnName,
      }),
    );
  }
}
