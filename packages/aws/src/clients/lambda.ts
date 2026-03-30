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

export function listLambdaFunctions(
  client: LambdaClient,
): AsyncGenerator<FunctionConfiguration> {
  return yieldAll(async (nextToken?: string) => {
    const res = await client.send(
      new ListFunctionsCommand({ Marker: nextToken }),
    );
    return { results: res.Functions, nextToken: res.NextMarker };
  });
}

export async function invoke(
  client: LambdaClient,
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<InvokeCommandOutput> {
  const payloadString = payload
    ? Buffer.from(Json.stringify(payload), "utf8")
    : undefined;
  return await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: payloadString,
    }),
  );
}

export async function getFunction(
  client: LambdaClient,
  functionName: string,
): Promise<GetFunctionCommandOutput> {
  const res = await client.send(
    new GetFunctionCommand({
      FunctionName: functionName,
    }),
  );

  return res;
}

export async function updateFunctionCode(
  client: LambdaClient,
  functionName: string,
  zipFile: string,
): Promise<UpdateFunctionCodeCommandOutput> {
  return await client.send(
    new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: fs.readFileSync(zipFile),
      Publish: true,
    }),
  );
}

export async function deleteLambdaFunctions(
  client: LambdaClient,
  fnNames: string[],
): Promise<void> {
  await confirmChangeItems("delete Lambda functions", fnNames);
  for (const fnName of fnNames) {
    await client.send(
      new DeleteFunctionCommand({
        FunctionName: fnName,
      }),
    );
  }
}
