import { CodeBuild, ListBuildsInput } from "@aws-sdk/client-codebuild";
import { Logger } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";

import { yieldAll } from "../helpers/aws";
import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getCodeBuildClient = regionalAwsClient(CodeBuild);

export function listProjects(client: CodeBuild): AsyncGenerator<string> {
  return yieldAll(async (token: string | undefined) => {
    const params: ListBuildsInput = {
      nextToken: token,
    };
    const result = await client.listProjects(params);
    Logger.debug("ListPipelines result:", result);
    return { results: result.projects, nextToken: result.nextToken };
  });
}

export async function deleteProjects(
  client: CodeBuild,
  buildProjectBatchGenerator: AsyncGenerator<string[]>,
): Promise<void> {
  for await (const buildIdBatch of buildProjectBatchGenerator) {
    await changeItems(
      "delete CodeBuild projects",
      buildIdBatch,
      async (buildId) => {
        await client.deleteProject({ name: buildId });
      },
    );
  }
}
