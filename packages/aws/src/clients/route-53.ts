import {
  ChangeAction,
  ChangeBatch,
  ChangeResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommandOutput,
  ListResourceRecordSetsCommand,
  ListResourceRecordSetsCommandOutput,
  ResourceRecordSet,
  Route53Client,
} from "@aws-sdk/client-route-53";
import { Logger } from "@dev/util";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getRoute53Client = regionalAwsClient(Route53Client);

export async function deleteRecordSet(
  client: Route53Client,
  hostedZoneId: string,
  resourceRecordSets: ResourceRecordSet[],
): Promise<ChangeResourceRecordSetsCommandOutput> {
  const changes = resourceRecordSets.map((r) => {
    return {
      Action: ChangeAction.DELETE,
      ResourceRecordSet: r,
    };
  });
  const changeBatch: ChangeBatch = {
    Changes: changes,
  };

  const res = await client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: changeBatch,
    }),
  );

  Logger.info("res", res);

  return res;
}

async function listRecordRecordSetsBatch(
  client: Route53Client,
  hostedZoneId: string,
  startRecordName?: string,
): Promise<ListResourceRecordSetsCommandOutput> {
  const res = await client.send(
    new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      StartRecordName: startRecordName,
      MaxItems: 300,
    }),
  );

  return res;
}

export async function listRecordRecordSets(
  client: Route53Client,
  hostedZoneId: string,
): Promise<Array<ResourceRecordSet>> {
  let nextRecordName: string | undefined;
  const allRecords = new Array<ResourceRecordSet>();
  do {
    const res = await listRecordRecordSetsBatch(
      client,
      hostedZoneId,
      nextRecordName,
    );
    nextRecordName = res.NextRecordName;
    allRecords.push(...(res.ResourceRecordSets || []));

    Logger.info("allRecords.length", allRecords.length);
  } while (nextRecordName);
  return allRecords;
}
