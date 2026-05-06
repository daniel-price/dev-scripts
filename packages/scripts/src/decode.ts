import { Logger, R } from "@dev/util";

export const R_Args = R.Record({
  string: R.String,
});

type T_Args = R.Static<typeof R_Args>;

export async function main(args: T_Args): Promise<void> {
  const decodedString = Buffer.from(args.string, "base64").toString("utf8");
  Logger.info(`Decoded string: ${decodedString}`);
}
