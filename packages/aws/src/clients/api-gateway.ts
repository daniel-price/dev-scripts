import {
  APIGatewayClient,
  DomainName,
  GetDomainNamesCommand,
} from "@aws-sdk/client-api-gateway";

import { yieldAll } from "../helpers/aws";
import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getAPIGatewayClient = regionalAwsClient(APIGatewayClient);

export function getCustomDomainNames(): AsyncGenerator<DomainName> {
  const client = getAPIGatewayClient();
  return yieldAll(async (nextToken?: string) => {
    const res = await client.send(
      new GetDomainNamesCommand({ position: nextToken }),
    );
    return { results: res.items, nextToken: res.position };
  });
}
