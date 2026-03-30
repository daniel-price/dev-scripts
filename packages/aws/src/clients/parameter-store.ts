import {
  DescribeParametersCommand,
  DescribeParametersCommandInput,
  GetParameterCommand,
  Parameter,
  PutParameterCommand,
  SSM,
} from "@aws-sdk/client-ssm";
import { Json, Logger, R } from "@dev/util";
import { isNonNil } from "@dev/util/src/util";

import { yieldAll } from "../helpers/aws";
import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getSsmClient = regionalAwsClient(SSM);

/** SSM client region: env, or legacy default used before regional factories. */
function ssmRegion(): string {
  return (
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    "us-east-1"
  );
}

export function listParameters(
  describeParametersCommandInput: Partial<DescribeParametersCommandInput> = {},
): AsyncGenerator<string> {
  const ssm = getSsmClient(ssmRegion());
  return yieldAll(async (nextToken?: string) => {
    const response = await ssm.send(
      new DescribeParametersCommand({
        ...describeParametersCommandInput,
        NextToken: nextToken,
        //only those that start with /param/
      }),
    );
    if (!response.Parameters) {
      throw new Error("Unable to fetch parameters");
    }
    return {
      results: response.Parameters.map((param) => param.Name).filter(isNonNil),
      nextToken: response.NextToken,
    };
  });
}

export async function getJSONParameterValue<T>(
  name: string,
  runtype: R.Runtype<T>,
): Promise<T> {
  const ssm = getSsmClient(ssmRegion());
  const params = {
    Name: name,
  };

  const command = new GetParameterCommand(params);
  const res = await ssm.send(command);
  Logger.debug("get parameter result", res);
  if (!res.Parameter?.Value) {
    throw new Error("Parameter value not found");
  }

  return R.assertType(runtype, JSON.parse(res.Parameter.Value));
}

export async function updateJSONParameter(
  name: string,
  value: Record<string, unknown>,
): Promise<void> {
  const ssm = getSsmClient(ssmRegion());
  const params = {
    Name: name,
    Value: Json.stringify(value),
    Overwrite: true,
  };

  const command = new PutParameterCommand(params);
  const res = await ssm.send(command);
  Logger.debug("update parameter result", res);
}

export async function getParameterValue<T>(
  name: string,
  runtype: R.Runtype<T>,
): Promise<T> {
  const ssm = getSsmClient(ssmRegion());
  const params = {
    Name: name,
  };

  const command = new GetParameterCommand(params);
  const res = await ssm.send(command);
  Logger.debug("get parameter result", res);
  if (!res.Parameter?.Value) {
    throw new Error("Parameter value not found");
  }

  return R.assertType(runtype, res.Parameter.Value);
}

export async function getParameters(names: string[]): Promise<Parameter[]> {
  const ssm = getSsmClient(ssmRegion());
  const result: Parameter[] = [];
  const batches = names.reduce(
    (acc: Array<Array<string>>, paramName: string, i: number) => {
      const chunkIndex = Math.floor(i / 10); //maximum allowed by SSM is 10
      acc[chunkIndex] = new Array<string>().concat(
        acc[chunkIndex] || new Array<string>(),
        paramName,
      );
      return acc;
    },
    [],
  );

  for (const batch of batches) {
    const response = await ssm.getParameters({ Names: batch });

    if (!response.Parameters) {
      throw new Error("Unable to fetch parameters");
    }
    result.push(...response.Parameters);
  }
  return result;
}

export async function updateParameter(
  name: string,
  value: string,
): Promise<void> {
  const ssm = getSsmClient(ssmRegion());
  const params = {
    Name: name,
    Value: value,
    Overwrite: true,
  };

  const command = new PutParameterCommand(params);
  const res = await ssm.send(command);
  Logger.debug("update parameter result", res);
}
