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

import { awsProxy } from "../helpers/awsProxy";

const ecs = awsProxy(new ECSClient());

export async function listTasks(clusterArn: string): Promise<string[]> {
  const res = await ecs.send(
    new ListTasksCommand({
      cluster: clusterArn,
    }),
  );

  return res.taskArns || [];
}

export async function listTags(resourceArn: string): Promise<Tag[]> {
  const res = await ecs.send(new ListTagsForResourceCommand({ resourceArn }));

  return res.tags || [];
}

export async function listTaskDefinitionFamilies(
  familyPrefix: string,
): Promise<string[]> {
  const res = await ecs.send(
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
  familyPrefix: string,
): Promise<string[]> {
  const res: ListTaskDefinitionsCommandOutput = await ecs.send(
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

  const res = await ecs.send(new RunTaskCommand(params));
  return res;
}
