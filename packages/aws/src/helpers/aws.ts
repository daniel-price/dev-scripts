import { Logger } from "@dev/util";

export async function* yieldAll<Result, Token>(
  fn: (
    token?: Token,
  ) => Promise<{ results?: Result[]; nextToken: Token | undefined }>,
  token?: Token,
): AsyncGenerator<Result> {
  let nextToken = token;
  do {
    try {
      Logger.debug("Calling yieldAll function with token", nextToken);
      const res = await fn(nextToken);
      Logger.debug("yieldAll function returned", res);
      nextToken = res.nextToken;
      const { results = [] } = res;

      Logger.debug("yieldAll retrieved results", results.length);
      for (const result of results) {
        Logger.debug("yielding result");
        yield result;
      }
    } catch (error) {
      Logger.error("Error during yieldAll operation", error);
      throw error;
    }
  } while (nextToken);
  Logger.debug("yieldAll completed");
}
