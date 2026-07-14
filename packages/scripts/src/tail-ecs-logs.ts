import { ContainerDefinition, Task } from "@aws-sdk/client-ecs";
import { ECS } from "@dev/aws";
import { Execute, Json, Logger, Prompt, R, Util } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    name: {
      type: R.String,
      description: "The name of the ECS task to tail logs for.",
      short: "n",
    },
    cluster: {
      type: R.String.optional(),
      description: "The ECS cluster to search. Defaults to all clusters.",
      short: "c",
    },
    container: {
      type: R.String.optional(),
      description: "The container to tail logs for. Prompts when omitted.",
    },
    region: {
      type: R.String.optional(),
      description: "The AWS region to use. Defaults to AWS_REGION.",
      short: "r",
    },
    lines: {
      type: R.Number.optional(),
      description: "The number of previous log lines to print before tailing.",
      default: 50,
      short: "l",
    },
  },
  help: () => {
    return "Tail CloudWatch logs for a running ECS task.";
  },
  run: async ({ name, cluster, container, region, lines }) => {
    const ecs = ECS.getECSClient(region);
    const matches = await ECS.findMatchingTasks(ecs, name, cluster);

    if (matches.length === 0) {
      throw new Error(`No running ECS tasks found matching "${name}"`);
    }

    const task =
      matches.length === 1
        ? matches[0]
        : await Prompt.select(
            "Select ECS task to tail logs for:",
            matches,
            getTaskLabel,
          );

    const containerName = await selectContainer(task, container);
    const taskDefinitionArn = task.taskDefinitionArn;
    if (!taskDefinitionArn) {
      throw new Error("Task definition ARN is missing");
    }

    const taskArn = task.taskArn;
    if (!taskArn) {
      throw new Error("Task ARN is missing");
    }

    const taskDefinition = await ECS.describeTaskDefinition(
      ecs,
      taskDefinitionArn,
    );
    const containerDefinition = taskDefinition.containerDefinitions?.find(
      ({ name }) => name === containerName,
    );

    if (!containerDefinition) {
      throw new Error(
        `Container "${containerName}" was not found in task definition ${taskDefinitionArn}`,
      );
    }

    const logStreamName = getLogStreamName(containerDefinition, taskArn);
    const logGroupName =
      containerDefinition.logConfiguration?.options?.["awslogs-group"];

    if (!logGroupName) {
      throw new Error(
        `Container "${containerName}" does not have an awslogs-group configured`,
      );
    }

    await printPreviousLogs(logGroupName, logStreamName, lines, region);

    Logger.info(`Tailing ${logGroupName}/${logStreamName}`);

    await Execute.exec(
      [
        "aws",
        "logs",
        "tail",
        logGroupName,
        "--log-stream-names",
        logStreamName,
        "--since",
        "1s",
        "--follow",
        ...(region ? ["--region", region] : []),
      ],
      { sync: true },
    );
  },
});

async function printPreviousLogs(
  logGroupName: string,
  logStreamName: string,
  lines: number,
  region?: string,
): Promise<void> {
  if (lines <= 0) return;

  const output = await Execute.exec([
    "aws",
    "logs",
    "get-log-events",
    "--log-group-name",
    logGroupName,
    "--log-stream-name",
    logStreamName,
    "--limit",
    String(Math.floor(lines)),
    "--no-start-from-head",
    ...(region ? ["--region", region] : []),
  ]);
  const parsedOutput = Json.parse(
    output,
    R.Object({
      events: R.Array(R.Object({ message: R.String })),
    }),
  );

  for (const event of parsedOutput.events) {
    process.stdout.write(`${event.message}\n`);
  }
}

async function selectContainer(
  task: Task,
  container?: string,
): Promise<string> {
  const containers = task.containers
    ?.map(({ name }) => name)
    .filter(Util.isNonNil);

  if (!containers?.length) {
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

  return await Prompt.select("Select container to tail logs for:", containers);
}

function getLogStreamName(
  containerDefinition: ContainerDefinition,
  taskArn: string,
): string {
  const logConfiguration = containerDefinition.logConfiguration;

  if (logConfiguration?.logDriver !== "awslogs") {
    throw new Error(
      `Container "${containerDefinition.name}" does not use the awslogs log driver`,
    );
  }

  const streamPrefix = logConfiguration.options?.["awslogs-stream-prefix"];
  if (!streamPrefix) {
    throw new Error(
      `Container "${containerDefinition.name}" does not have an awslogs-stream-prefix configured`,
    );
  }

  return `${streamPrefix}/${containerDefinition.name}/${getTaskId(taskArn)}`;
}

function getTaskLabel(task: Task): string {
  const clusterArn = task.clusterArn || "unknown-cluster";
  const clusterName = clusterArn.split("/").pop() || clusterArn;
  const taskId = task.taskArn ? getTaskId(task.taskArn) : "unknown-task";
  const family =
    ECS.getTaskDefinitionFamily(task) || task.group || "unknown-family";
  const containerNames =
    task.containers
      ?.map(({ name }) => name)
      .filter(Util.isNonNil)
      .join(", ") || "no containers";

  return `${family} (${taskId}) in ${clusterName}: ${containerNames}`;
}

function getTaskId(taskArn: string): string {
  return taskArn.split("/").pop() || taskArn;
}
