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

const route53 = new Route53Client();

export async function deleteRecordSet(
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

  const res = await route53.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: changeBatch,
    }),
  );

  Logger.info("res", res);

  return res;
}

async function listRecordRecordSetsBatch(
  hostedZoneId: string,
  startRecordName?: string,
): Promise<ListResourceRecordSetsCommandOutput> {
  const res = await route53.send(
    new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      StartRecordName: startRecordName,
      MaxItems: 300,
    }),
  );

  return res;
}

export async function listRecordRecordSets(
  hostedZoneId: string,
): Promise<Array<ResourceRecordSet>> {
  let nextRecordName: string | undefined;
  const allRecords = new Array<ResourceRecordSet>();
  do {
    const res = await listRecordRecordSetsBatch(hostedZoneId, nextRecordName);
    nextRecordName = res.NextRecordName;
    allRecords.push(...(res.ResourceRecordSets || []));

    Logger.info("allRecords.length", allRecords.length);
  } while (nextRecordName);
  return allRecords;
}
