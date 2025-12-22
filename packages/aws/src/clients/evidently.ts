import {
  Evidently,
  FeatureSummary,
  ListFeaturesCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-evidently";

import { awsProxy } from "../helpers/awsProxy";

const evidently = awsProxy(new Evidently());

export async function listProjects(nextToken?: string): Promise<Array<string>> {
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
