import { Logger, retry } from "@dev/util";
import { changeItems } from "@dev/util/src/change-items";
import { CodePipeline } from "aws-sdk";

const codepipeline = new CodePipeline();

export async function listPipelines(): Promise<CodePipeline.PipelineSummary[]> {
  const result = await codepipeline.listPipelines().promise();
  Logger.debug("ListPipelines result:", result);
  return result.pipelines || [];
}

async function deletePipeline(
  pipeline: CodePipeline.PipelineSummary,
): Promise<void> {
  Logger.debug(`Deleting pipeline: ${pipeline.name}`);
  await retry(async () => {
    if (!pipeline.name) {
      throw new Error("Pipeline name is undefined", { cause: pipeline });
    }
    const res = await codepipeline
      .deletePipeline({ name: pipeline.name })
      .promise();
    return res;
  });
  Logger.debug(`Deleted pipeline: ${pipeline.name}`);
}

export async function deletePipelines(
  pipelines: CodePipeline.PipelineSummary[],
): Promise<void> {
  await changeItems(
    "Delete CodePipelines",
    pipelines,
    deletePipeline,
    (pipeline) => pipeline.name,
  );
}
