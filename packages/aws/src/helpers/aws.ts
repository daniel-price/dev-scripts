import { retry } from "@dev/util";

export async function* yieldAll<Result, Token>(
  fn: (
    token?: Token,
  ) => Promise<{ results?: Result[]; nextToken: Token | undefined }>,
  token?: Token,
): AsyncGenerator<Result> {
  let nextToken = token;
  do {
    const res = await retry(() => fn(nextToken));
    nextToken = res.nextToken;
    const { results = [] } = res;

    for (const result of results) {
      yield result;
    }
  } while (nextToken);
}
