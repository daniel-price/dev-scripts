import {
  DeleteFunctionCommand,
  FunctionConfiguration,
  GetFunctionCommand,
  GetFunctionCommandOutput,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  InvokeCommandOutput,
  LambdaClient,
  ListFunctionsCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionCodeCommandOutput,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { ChangeItems, Json, Logger, R, retry } from "@dev/util";
import { confirmChangeItems } from "@dev/util/src/change-items";
import fs from "fs";

import { awsJSON, getAll, getQueryArg } from "../helpers/aws";

const G_Lambda = R.Record({
  FunctionName: R.String,
});

type T_Lambda = R.Static<typeof G_Lambda>;

const lambda = new LambdaClient();

export async function listLambdaFunctions(): Promise<FunctionConfiguration[]> {
  return await getAll(async (nextToken?: string) => {
    const res = await lambda.send(
      new ListFunctionsCommand({ Marker: nextToken }),
    );
    return { results: res.Functions, nextToken: res.NextMarker };
  });
}

export async function getLambdaFunctionNames(
  queries?: string[],
): Promise<string[]> {
  const queryArg = getQueryArg(queries, "Functions", "FunctionName");
  return await awsJSON(R.String, "lambda", "list-functions", queryArg);
}

export async function updateEnvVariable(
  lambdaFn: T_Lambda,
  varName: string,
  varValue: string,
  addIfNotExists = false,
): Promise<void> {
  const existingEnvVars = await getEnvironmentVariables(lambdaFn);
  const existingValue = existingEnvVars[varName];
  const shouldUpdate =
    existingValue !== varValue &&
    (existingValue !== undefined || addIfNotExists);

  Logger.info(
    `${lambdaFn} ${varName}="${existingValue}" -${
      shouldUpdate ? "" : " not"
    } updating to "${varValue}"`,
  );

  if (!shouldUpdate) return;

  const newEnvVars = { ...existingEnvVars, [varName]: varValue };
  const newEnv = { Variables: newEnvVars };

  await lambda.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: lambdaFn.FunctionName,
      Environment: newEnv,
    }),
  );
}

export async function getEnvironmentVariables(
  lambdaFn: T_Lambda,
): Promise<Record<string, string>> {
  return retry(async () => {
    const res = await lambda.send(
      new GetFunctionConfigurationCommand({
        FunctionName: lambdaFn.FunctionName,
      }),
    );

    return res.Environment?.Variables || {};
  });
}

export async function updateEnvVariables(
  lambdaFn: T_Lambda[],
  varName: string,
  varValue: string,
  addIfNotExists = false,
): Promise<void> {
  const update = (lambdaFn: T_Lambda): Promise<void> => {
    return updateEnvVariable(lambdaFn, varName, varValue, addIfNotExists);
  };
  await ChangeItems.changeItems(
    `update envVariable ${varName} to ${varValue}`,
    lambdaFn,
    update,
  );
}

export async function invoke(
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<InvokeCommandOutput> {
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
  return await lambda.send(
    new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: fs.readFileSync(zipFile),
      Publish: true,
    }),
  );
}

export async function deleteLambdaFunctions(fnNames: string[]): Promise<void> {
  await confirmChangeItems("delete Lambda functions", fnNames);
  for (const fnName of fnNames) {
    await lambda.send(
      new DeleteFunctionCommand({
        FunctionName: fnName,
      }),
    );
  }
}
