import { R } from "@dev/util";

import { awsJSON, getQueryArg } from "../helpers/aws";

const G_RoleName = R.String;

type T_RoleName = R.Static<typeof G_RoleName>;

export async function getRoleNames(queries?: string[]): Promise<T_RoleName[]> {
  const queryArg = getQueryArg(queries, "Roles", "RoleName");
  return await awsJSON(G_RoleName, "iam", "list-roles", queryArg);
}
