import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  DescribeStackEventsOutput,
  DescribeStackResourcesCommand,
  DescribeStackResourcesCommandInput,
  DescribeStacksCommand,
  DescribeStacksCommandOutput,
  DescribeStacksInput,
  ListStacksCommand,
  StackStatus,
} from "@aws-sdk/client-cloudformation";
import { Enum, Logger } from "@dev/util";
import { ensureFieldsSet } from "@dev/util/src/types";
import { isNonNil } from "@dev/util/src/util";

import { yieldAll } from "../../helpers/aws";
import { StackSummary } from "./cloudformation-types";

const cf = new CloudFormationClient();

export { StackStatus };

function isValidStackStatus(value: string): value is StackStatus {
  return value in StackStatus;
}

export const ALL_STACK_STATUSES = Enum.values(StackStatus);

export const ACTIVE_STACK_STATUSES = [
  StackStatus.CREATE_COMPLETE,
  StackStatus.DELETE_FAILED,
  StackStatus.UPDATE_COMPLETE,
  StackStatus.UPDATE_ROLLBACK_COMPLETE,
  StackStatus.ROLLBACK_COMPLETE,
];

export async function describeStackResources(
  stackName: string,
  stackStatuses: StackStatus[],
  resourceType?: string,
): Promise<string[]> {
  const params: DescribeStackResourcesCommandInput = { StackName: stackName };
  try {
    const command = new DescribeStackResourcesCommand(params);

    const res = await cf.send(command);

    if (!res.StackResources) throw new Error("StackResources is not defined");

    const filtered = res.StackResources.filter((sr) => {
      if (!sr.ResourceStatus) throw new Error("ResourceStatus is not defined");
      if (!isValidStackStatus(sr.ResourceStatus))
        throw new Error(`Resource status ${sr.ResourceStatus} is not valid!`);
      return stackStatuses.includes(StackStatus[sr.ResourceStatus]);
    });

    return filtered
      .map((sr) => {
        if (resourceType && sr.ResourceType !== resourceType) return null;
        return sr.PhysicalResourceId;
      })
      .filter(isNonNil);
  } catch (e) {
    Logger.error("error describing stack resources", e);
    throw e;
  }
}

export function listStacks(
  statusFilter?: StackStatus[],
): AsyncGenerator<StackSummary> {
  return yieldAll(async (token?: string | undefined) => {
    const response = await cf.send(
      new ListStacksCommand({
        NextToken: token,
        StackStatusFilter: statusFilter,
      }),
    );
    const { StackSummaries, NextToken } = response;
    if (!StackSummaries) throw new Error("StackSummaries is not defined");
    const results = StackSummaries.map((s) =>
      ensureFieldsSet(s, ["StackName", "StackStatus"]),
    );
    return { results, nextToken: NextToken };
  });
}

export async function deleteStack(stackName: string): Promise<void> {
  await cf.send(new DescribeStacksCommand({ StackName: stackName }));
}

export async function describeStackEvents(
  stackName: string,
): Promise<DescribeStackEventsOutput> {
  const res = await cf.send(
    new DescribeStackEventsCommand({ StackName: stackName }),
  );
  return res;
}

export async function describeStack(
  stackName: string,
): Promise<DescribeStacksCommandOutput> {
  const params: DescribeStacksInput = { StackName: stackName };
  const res = await cf.send(new DescribeStacksCommand(params));
  return res;
}
