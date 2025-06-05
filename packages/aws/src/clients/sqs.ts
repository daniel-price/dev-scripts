import { R } from "@dev/util";

import { awsJSON, getQueryArg } from "../helpers/aws";

const G_Queue = R.Record({
  QueueUrls: R.String,
});

type T_Queue = R.Static<typeof G_Queue>;

export async function getSqsQueues(queries?: string[]): Promise<T_Queue[]> {
  const queryArg = getQueryArg(queries, "QueueUrls");
  return await awsJSON(G_Queue, "sqs", "list-queues", queryArg);
}
