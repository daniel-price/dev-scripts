import {
  APIGatewayClient,
  DomainName,
  GetDomainNamesCommand,
} from "@aws-sdk/client-api-gateway";

import { yieldAll } from "../helpers/aws";

const client = new APIGatewayClient({});

export function getCustomDomainNames(): AsyncGenerator<DomainName> {
  return yieldAll(async (nextToken?: string) => {
    const res = await client.send(
      new GetDomainNamesCommand({ position: nextToken }),
    );
    return { results: res.items, nextToken: res.position };
  });
}
