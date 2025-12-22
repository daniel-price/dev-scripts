import {
  APIGatewayClient,
  DomainName,
  GetDomainNamesCommand,
} from "@aws-sdk/client-api-gateway";

import { yieldAll } from "../helpers/aws";
import { awsProxy } from "../helpers/awsProxy";

const client = awsProxy(new APIGatewayClient());

export function getCustomDomainNames(): AsyncGenerator<DomainName> {
  return yieldAll(async (nextToken?: string) => {
    const res = await client.send(
      new GetDomainNamesCommand({ position: nextToken }),
    );
    return { results: res.items, nextToken: res.position };
  });
}
