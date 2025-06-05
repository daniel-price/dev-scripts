import {
  APIGatewayClient,
  DomainName,
  GetDomainNamesCommand,
} from "@aws-sdk/client-api-gateway";
import { R } from "@dev/util";

import { awsJSON, getAll, getQueryArg } from "../helpers/aws";

const G_ApiGateway = R.Record({
  ApiId: R.String,
  Name: R.String,
});

type T_ApiGateway = R.Static<typeof G_ApiGateway>;

export async function getApiGateways(
  queries?: string[],
): Promise<T_ApiGateway[]> {
  const queryArg = getQueryArg(queries, "Items", ["ApiId", "Name"]);
  const result = await awsJSON(
    G_ApiGateway,
    "apigatewayv2",
    "get-apis",
    queryArg,
  );
  return result;
}

const client = new APIGatewayClient({});

export async function getCustomDomainNames(): Promise<DomainName[]> {
  return await getAll(async (nextToken?: string) => {
    const res = await client.send(
      new GetDomainNamesCommand({ position: nextToken }),
    );
    return { results: res.items, nextToken: res.position };
  });
}
