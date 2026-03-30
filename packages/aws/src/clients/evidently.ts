import {
  Evidently,
  FeatureSummary,
  ListFeaturesCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-evidently";

import { regionalAwsClient } from "../helpers/regionalAwsClient";

export const getEvidentlyClient = regionalAwsClient(Evidently);

export async function listProjects(
  client: Evidently,
  nextToken?: string,
): Promise<Array<string>> {
  const result = await client.send(new ListProjectsCommand({ nextToken }));

  if (!result.projects) throw new Error("No projects");

  const projects = result.projects.map((p) => p.name) as Array<string>;

  if (result.nextToken) {
    projects.push(...(await listProjects(client, result.nextToken)));
  }

  return projects;
}

export async function getFeatureFlags(
  client: Evidently,
  project: string,
  nextToken?: string,
): Promise<FeatureSummary[]> {
  const result = await client.send(
    new ListFeaturesCommand({ project, nextToken }),
  );
  if (!result.features) throw new Error("No features");

  const featureFlags = result.features;

  if (result.nextToken) {
    featureFlags.push(
      ...(await getFeatureFlags(client, project, result.nextToken)),
    );
  }

  return featureFlags;
}
