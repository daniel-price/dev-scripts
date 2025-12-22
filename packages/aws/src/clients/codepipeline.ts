import { CodePipeline, PipelineSummary } from "@aws-sdk/client-codepipeline";
import { Logger } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";

import { awsProxy } from "../helpers/awsProxy";

const codepipeline = awsProxy(new CodePipeline());

export async function listPipelines(): Promise<PipelineSummary[]> {
  const result = await codepipeline.listPipelines();
  Logger.debug("ListPipelines result:", result);
  return result.pipelines || [];
}

async function deletePipeline(pipeline: PipelineSummary): Promise<void> {
  if (!pipeline.name) {
    throw new Error("Pipeline name is undefined", { cause: pipeline });
  }
  await codepipeline.deletePipeline({ name: pipeline.name });
}

export async function deletePipelines(
  pipelines: PipelineSummary[],
): Promise<void> {
  await changeItems(
    "Delete CodePipelines",
    pipelines,
    deletePipeline,
    (pipeline) => pipeline.name,
  );
}
