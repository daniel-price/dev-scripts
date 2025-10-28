import { Lambda } from "@dev/aws";
import { Logger, R } from "@dev/util";

export const R_Args = R.Record({ queries: R.String });

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const queries = args.queries.split(",");
  Logger.info("Finding lambda with queries", queries);
  const names = await Lambda.getLambdaFunctionNames(queries);
  Logger.info("Found lambda functions", names);
}
