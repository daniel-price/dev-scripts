import { Lambda } from "@dev/aws";
import { Logger, R } from "@dev/util";
import { isNonNil } from "@dev/util/src/util";

export const R_Args = R.Record({
  prefix: R.String,
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const fns = await Lambda.listLambdaFunctions();

  const filtered = fns
    .filter((fn) => fn.FunctionName?.startsWith(args.prefix))
    .map((fn) => fn.FunctionName)
    .filter(isNonNil);

  Logger.info(
    `Found ${filtered.length} functions with prefix "${args.prefix}"`,
    filtered,
  );

  for (const fn of filtered) {
    await Lambda.deleteLambdaFunction(fn);
  }
}
