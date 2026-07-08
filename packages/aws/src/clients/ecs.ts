import {
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListClustersCommand,
  ListTagsForResourceCommand,
  ListTaskDefinitionFamiliesCommand,
  ListTaskDefinitionsCommand,
  ListTaskDefinitionsCommandOutput,
  ListTasksCommand,
  RunTaskCommand,
  RunTaskCommandInput,
  RunTaskCommandOutput,
  Tag,
  Task,
  TaskDefinition,
} from "@aws-sdk/client-ecs";
import { ArrayUtil, Logger, Util } from "@dev/util";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getECSClient = regionalAwsClient(ECSClient);

export async function listClusters(client: ECSClient): Promise<string[]> {
  const clusterArns: string[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(new ListClustersCommand({ nextToken }));
    clusterArns.push(...(res.clusterArns || []));
    nextToken = res.nextToken;
  } while (nextToken);

  return clusterArns;
}

export async function listTasks(
  client: ECSClient,
  clusterArn: string,
): Promise<string[]> {
  const res = await client.send(
    new ListTasksCommand({
      cluster: clusterArn,
    }),
  );

  return res.taskArns || [];
}

export async function listRunningTasks(
  client: ECSClient,
  clusterArn: string,
): Promise<string[]> {
  const taskArns: string[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new ListTasksCommand({
        cluster: clusterArn,
        desiredStatus: "RUNNING",
        nextToken,
      }),
    );
    taskArns.push(...(res.taskArns || []));
    nextToken = res.nextToken;
  } while (nextToken);

  return taskArns;
}

export async function describeTasks(
  client: ECSClient,
  clusterArn: string,
  taskArns: string[],
): Promise<Task[]> {
  const tasks: Task[] = [];

  for (const taskArnBatch of ArrayUtil.chunk(taskArns, 100)) {
    const res = await client.send(
      new DescribeTasksCommand({
        cluster: clusterArn,
        tasks: taskArnBatch,
        include: ["TAGS"],
      }),
    );
    tasks.push(...(res.tasks || []));
  }

  return tasks;
}

export async function describeTaskDefinition(
  client: ECSClient,
  taskDefinitionArn: string,
): Promise<TaskDefinition> {
  const res = await client.send(
    new DescribeTaskDefinitionCommand({ taskDefinition: taskDefinitionArn }),
  );

  if (!res.taskDefinition) {
    throw new Error(`Unable to describe task definition ${taskDefinitionArn}`);
  }

  return res.taskDefinition;
}

export async function findMatchingTasks(
  client: ECSClient,
  name: string,
  cluster?: string,
): Promise<Task[]> {
  const clusters = cluster ? [cluster] : await listClusters(client);
  Logger.debug(`Searching for ECS tasks in clusters: ${clusters.join(", ")}`);
  const matches: Task[] = [];

  for (const clusterArn of clusters) {
    Logger.debug(`Searching for ECS tasks in cluster: ${clusterArn}`);
    const taskArns = await listRunningTasks(client, clusterArn);
    Logger.debug(
      `Found ${taskArns.length} running tasks in cluster: ${clusterArn}`,
    );
    if (taskArns.length === 0) continue;

    for (const task of await describeTasks(client, clusterArn, taskArns)) {
      if (taskMatchesName(task, name)) {
        matches.push(task);
      }
    }
  }

  return matches;
}

export function getTaskDefinitionFamily(task: Task): string | undefined {
  return task.taskDefinitionArn?.split("/").pop()?.split(":")[0];
}

function taskMatchesName(task: Task, name: string): boolean {
  const needle = name.toLowerCase();

  return getSearchableTaskValues(task).some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function getSearchableTaskValues(task: Task): string[] {
  return [
    task.taskArn,
    task.taskDefinitionArn,
    task.group,
    task.startedBy,
    getTaskDefinitionFamily(task),
    ...(task.tags || []).flatMap(({ key, value }) => [key, value]),
    ...(task.containers || []).flatMap(({ name, runtimeId }) => [
      name,
      runtimeId,
    ]),
  ].filter(Util.isNonNil);
}

export async function listTags(
  client: ECSClient,
  resourceArn: string,
): Promise<Tag[]> {
  const res = await client.send(
    new ListTagsForResourceCommand({ resourceArn }),
  );

  return res.tags || [];
}

export async function listTaskDefinitionFamilies(
  client: ECSClient,
  familyPrefix: string,
): Promise<string[]> {
  const res = await client.send(
    new ListTaskDefinitionFamiliesCommand({
      familyPrefix,
    }),
  );

  if (!res.families) {
    throw new Error(
      `Unable to list task definition families for ${familyPrefix}`,
    );
  }

  return res.families;
}

export async function listTaskDefinitions(
  client: ECSClient,
  familyPrefix: string,
): Promise<string[]> {
  const res: ListTaskDefinitionsCommandOutput = await client.send(
    new ListTaskDefinitionsCommand({
      familyPrefix,
    }),
  );

  if (!res.taskDefinitionArns) {
    throw new Error(`Unable to list task definitions for ${familyPrefix}`);
  }

  return res.taskDefinitionArns;
}

export async function runTask(
  client: ECSClient,
  clusterArn: string,
  taskDefinition: string,
  tags: { key: string; value: string }[],
  subnets: string[],
  securityGroups: string[],
  containerOverrides: {
    name: string;
    environment: { name: string; value: string }[];
  }[],
): Promise<RunTaskCommandOutput> {
  const params: RunTaskCommandInput = {
    cluster: clusterArn,
    taskDefinition,
    tags,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets,
        securityGroups,
      },
    },
    overrides: {
      containerOverrides,
    },
  };

  const res = await client.send(new RunTaskCommand(params));
  return res;
}
