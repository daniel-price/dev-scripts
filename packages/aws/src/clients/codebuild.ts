import { CodeBuild, ListBuildsInput } from "@aws-sdk/client-codebuild";
import { Logger } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";

import { yieldAll } from "../helpers/aws";
import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getCodeBuildClient = regionalAwsClient(CodeBuild);

export function listProjects(): AsyncGenerator<string> {
  const codebuild = getCodeBuildClient();
  return yieldAll(async (token: string | undefined) => {
    const params: ListBuildsInput = {
      nextToken: token,
    };
    const result = await codebuild.listProjects(params);
    Logger.debug("ListPipelines result:", result);
    return { results: result.projects, nextToken: result.nextToken };
  });
}

export async function deleteProjects(
  buildProjectBatchGenerator: AsyncGenerator<string[]>,
): Promise<void> {
  const codebuild = getCodeBuildClient();
  for await (const buildIdBatch of buildProjectBatchGenerator) {
    await changeItems(
      "delete CodeBuild projects",
      buildIdBatch,
      async (buildId) => {
        await codebuild.deleteProject({ name: buildId });
      },
    );
  }
}
