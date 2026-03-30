import {
  Evidently,
  FeatureSummary,
  ListFeaturesCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-evidently";

import {
  regionalAwsClient,
  resolveAwsRegion,
} from "../helpers/regionalAwsClient";

export const getEvidentlyClient = regionalAwsClient(Evidently);

export async function listProjects(nextToken?: string): Promise<Array<string>> {
  const evidently = getEvidentlyClient(resolveAwsRegion());
  const result = await evidently.send(new ListProjectsCommand({ nextToken }));

  if (!result.projects) throw new Error("No projects");

  const projects = result.projects.map((p) => p.name) as Array<string>;

  if (result.nextToken) {
    projects.push(...(await listProjects(result.nextToken)));
  }

  return projects;
}

export async function getFeatureFlags(
  project: string,
  nextToken?: string,
): Promise<FeatureSummary[]> {
  const evidently = getEvidentlyClient(resolveAwsRegion());
  const result = await evidently.send(
    new ListFeaturesCommand({ project, nextToken }),
  );
  if (!result.features) throw new Error("No features");

  const featureFlags = result.features;

  if (result.nextToken) {
    featureFlags.push(...(await getFeatureFlags(project, result.nextToken)));
  }

  return featureFlags;
}
