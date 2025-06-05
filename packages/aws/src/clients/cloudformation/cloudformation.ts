import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  DescribeStackEventsOutput,
  DescribeStackResourcesCommand,
  DescribeStackResourcesCommandInput,
  DescribeStacksCommand,
  DescribeStacksCommandOutput,
  DescribeStacksInput,
} from "@aws-sdk/client-cloudformation";
import { Enum, Logger } from "@dev/util";
import { isNonNil } from "@dev/util/src/util";

import { aws, awsJSON, getQueryArg } from "../../helpers/aws";
import { G_Stack, T_Stack } from "./cloudformation-types";

const cf = new CloudFormationClient();

export enum E_STACK_STATUS {
  CREATE_IN_PROGRESS = "CREATE_IN_PROGRESS",
  CREATE_FAILED = "CREATE_FAILED",
  CREATE_COMPLETE = "CREATE_COMPLETE",
  ROLLBACK_IN_PROGRESS = "ROLLBACK_IN_PROGRESS",
  ROLLBACK_FAILED = "ROLLBACK_FAILED",
  ROLLBACK_COMPLETE = "ROLLBACK_COMPLETE",
  DELETE_IN_PROGRESS = "DELETE_IN_PROGRESS",
  DELETE_FAILED = "DELETE_FAILED",
  DELETE_COMPLETE = "DELETE_COMPLETE",
  UPDATE_IN_PROGRESS = "UPDATE_IN_PROGRESS",
  UPDATE_COMPLETE_CLEANUP_IN_PROGRESS = "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS",
  UPDATE_COMPLETE = "UPDATE_COMPLETE",
  UPDATE_FAILED = "UPDATE_FAILED",
  UPDATE_ROLLBACK_IN_PROGRESS = "UPDATE_ROLLBACK_IN_PROGRESS",
  UPDATE_ROLLBACK_FAILED = "UPDATE_ROLLBACK_FAILED",
  UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS = "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
  UPDATE_ROLLBACK_COMPLETE = "UPDATE_ROLLBACK_COMPLETE",
  REVIEW_IN_PROGRESS = "REVIEW_IN_PROGRESS",
  IMPORT_IN_PROGRESS = "IMPORT_IN_PROGRESS",
  IMPORT_COMPLETE = "IMPORT_COMPLETE",
  IMPORT_ROLLBACK_IN_PROGRESS = "IMPORT_ROLLBACK_IN_PROGRESS",
  IMPORT_ROLLBACK_FAILED = "IMPORT_ROLLBACK_FAILED",
  IMPORT_ROLLBACK_COMPLETE = "IMPORT_ROLLBACK_COMPLETE",
}

function isValidStackStatus(
  value: string,
): value is keyof typeof E_STACK_STATUS {
  return value in E_STACK_STATUS;
}

export const ACTIVE_STACK_STATUSES = [
  E_STACK_STATUS.CREATE_COMPLETE,
  E_STACK_STATUS.DELETE_FAILED,
  E_STACK_STATUS.UPDATE_COMPLETE,
];

export async function describeStackResources(
  stackName: string,
  stackStatuses: E_STACK_STATUS[],
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
      return stackStatuses.includes(E_STACK_STATUS[sr.ResourceStatus]);
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

function getStatusFilterArg(statusFilter?: string[]): string {
  if (!statusFilter) return "";
  return `--stack-status-filter ${statusFilter.join(" ")}`;
}

export const ALL_STACK_STATUSES = Array.from(
  Enum.enumToMap(E_STACK_STATUS).values(),
);

export async function getStackNamesAndStatuses(
  queries?: string[],
  statusFilter?: string[],
): Promise<T_Stack[]> {
  const queryArg = getQueryArg(queries, "StackSummaries", [
    "StackName",
    "StackStatus",
  ]);
  const statusFilterArg = getStatusFilterArg(statusFilter);

  const stacks = await awsJSON(
    G_Stack,
    "cloudformation",
    "list-stacks",
    queryArg,
    statusFilterArg,
  );

  Logger.info(stacks);

  return stacks;
}

export async function deleteStack(stackName: string): Promise<void> {
  await aws("cloudformation", "delete-stack", "--stack-name", stackName);
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
