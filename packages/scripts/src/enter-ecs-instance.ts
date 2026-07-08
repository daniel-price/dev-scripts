import { Task } from "@aws-sdk/client-ecs";
import { ECS } from "@dev/aws";
import { Execute, Logger, Prompt, R, Util } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    name: {
      type: R.String,
      description: "The name of the ECS instance to enter.",
      short: "n",
    },
    cluster: {
      type: R.String.optional(),
      description: "The ECS cluster to search. Defaults to all clusters.",
      short: "c",
    },
    container: {
      type: R.String.optional(),
      description: "The container to enter. Prompts when omitted.",
    },
    command: {
      type: R.String.optional(),
      description: "The command to run in the container.",
      default: "/bin/sh",
    },
    region: {
      type: R.String.optional(),
      description: "The AWS region to use. Defaults to AWS_REGION.",
      short: "r",
    },
  },
  help: () => {
    return "Connect to an ECS instance by name.";
  },
  run: async ({ name, cluster, container, command, region }) => {
    const ecs = ECS.getECSClient(region);
    const matches = await ECS.findMatchingTasks(ecs, name, cluster);

    if (matches.length === 0) {
      throw new Error(`No running ECS tasks found matching "${name}"`);
    }

    const match = await selectTask(matches);
    const containerName = await selectContainer(match.task, container);

    Logger.info(
      `Connecting to ${containerName} in ${getTaskLabel(match.task, match.clusterArn)}`,
    );

    const taskArn = match.task.taskArn;
    if (!taskArn) {
      throw new Error("Task ARN is missing");
    }

    await Execute.exec(
      [
        "aws",
        "ecs",
        "execute-command",
        "--cluster",
        match.clusterArn,
        "--task",
        taskArn,
        "--container",
        containerName,
        "--interactive",
        "--command",
        command,
        ...(region ? ["--region", region] : []),
      ],
      { sync: true },
    );
  },
});

async function selectTask(matches: ECS.TaskMatch[]): Promise<ECS.TaskMatch> {
  if (matches.length === 1) {
    return matches[0];
  }

  return Prompt.selectItem(
    "Select ECS task to enter:",
    matches,
    (match, index) =>
      `${index + 1}. ${getTaskLabel(match.task, match.clusterArn)}`,
  );
}

async function selectContainer(task: Task, container?: string): Promise<string> {
  const containers = task.containers
    ?.map(({ name }) => name)
    .filter(Util.isNonNil);

  if (!containers || containers.length === 0) {
    throw new Error(`No containers found for task ${task.taskArn}`);
  }

  if (container) {
    if (!containers.includes(container)) {
      throw new Error(
        `Container "${container}" was not found. Available containers: ${containers.join(
          ", ",
        )}`,
      );
    }

    return container;
  }

  if (containers.length === 1) {
    return containers[0];
  }

  return Prompt.select("Select container to enter:", containers);
}

function getTaskLabel(task: Task, clusterArn: string): string {
  const clusterName = clusterArn.split("/").pop() || clusterArn;
  const taskId = task.taskArn?.split("/").pop() || "unknown-task";
  const family =
    ECS.getTaskDefinitionFamily(task) || task.group || "unknown-family";
  const containerNames =
    task.containers?.map(({ name }) => name).filter(Util.isNonNil).join(", ") ||
    "no containers";

  return `${family} (${taskId}) in ${clusterName}: ${containerNames}`;
}

