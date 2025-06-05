import { R } from "@dev/util";

import { awsJSON, getQueryArg } from "../helpers/aws";

const G_SnsTopic = R.Record({
  TopicArn: R.String,
});
type T_SnsTopic = R.Static<typeof G_SnsTopic>;

export async function getSnsTopicArns(
  queries?: string[],
): Promise<T_SnsTopic[]> {
  const queryArg = getQueryArg(queries, "Topics", "TopicArn");
  const result = await awsJSON(G_SnsTopic, "sns", "list-topics", queryArg);

  return result;
}
