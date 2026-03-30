import { CodePipeline, PipelineSummary } from "@aws-sdk/client-codepipeline";
import { Logger } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getCodePipelineClient = regionalAwsClient(CodePipeline);

export async function listPipelines(
  client: CodePipeline,
): Promise<PipelineSummary[]> {
  const result = await client.listPipelines();
  Logger.debug("ListPipelines result:", result);
  return result.pipelines || [];
}

async function deletePipeline(
  client: CodePipeline,
  pipeline: PipelineSummary,
): Promise<void> {
  if (!pipeline.name) {
    throw new Error("Pipeline name is undefined", { cause: pipeline });
  }
  await client.deletePipeline({ name: pipeline.name });
}

export async function deletePipelines(
  client: CodePipeline,
  pipelines: PipelineSummary[],
): Promise<void> {
  await changeItems(
    "Delete CodePipelines",
    pipelines,
    (pipeline) => deletePipeline(client, pipeline),
    (pipeline) => pipeline.name,
  );
}
