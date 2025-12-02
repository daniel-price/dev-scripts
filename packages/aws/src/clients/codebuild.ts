import { Logger } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";
import { CodeBuild } from "aws-sdk";
import { ListBuildsInput } from "aws-sdk/clients/codebuild";

import { yieldAll } from "../helpers/aws";

const codebuild = new CodeBuild();

export function listProjects(): AsyncGenerator<CodeBuild.ProjectName> {
  return yieldAll(async (token: string | undefined) => {
    const params: ListBuildsInput = {
      nextToken: token,
    };
    const result = await codebuild.listProjects(params).promise();
    Logger.debug("ListPipelines result:", result);
    return { results: result.projects, nextToken: result.nextToken };
  });
}

export async function deleteProjects(
  buildProjectBatchGenerator: AsyncGenerator<string[]>,
): Promise<void> {
  for await (const buildIdBatch of buildProjectBatchGenerator) {
    await changeItems(
      "delete CodeBuild projects",
      buildIdBatch,
      async (buildId) => {
        await codebuild.deleteProject({ name: buildId }).promise();
      },
    );
  }
}
