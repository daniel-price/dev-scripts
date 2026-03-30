import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTaskDefinitionFamiliesCommand,
  ListTaskDefinitionsCommand,
  ListTaskDefinitionsCommandOutput,
  ListTasksCommand,
  RunTaskCommand,
  RunTaskCommandInput,
  RunTaskCommandOutput,
  Tag,
} from "@aws-sdk/client-ecs";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getECSClient = regionalAwsClient(ECSClient);

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
