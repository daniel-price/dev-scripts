import * as Logger from "./logger";
import { sleep } from "./util";

const defaultRetryPredicate: (err: unknown) => boolean = (_: unknown) => true;

const defaultConfig = {
  retriesLeft: 2,
  interval: 1000,
  exponential: true,
  retryPredicate: defaultRetryPredicate,
};

export async function retry<T>(
  fn: (retriesLeft?: number) => Promise<T>,
  config: Partial<typeof defaultConfig> = defaultConfig,
): Promise<T> {
  const { retriesLeft, exponential, retryPredicate, interval } = {
    ...defaultConfig,
    ...config,
  };
  try {
    return await fn(retriesLeft);
  } catch (err) {
    const shouldRetry = retriesLeft <= 0 || !retryPredicate(err);
    Logger.debug(
      `Retry caught error, retries left: ${retriesLeft}, shouldRetry: ${shouldRetry}`,
      err,
    );
    if (shouldRetry) {
      throw err;
    }

    Logger.debug(`Sleeping for ${interval}ms before retrying...`);
    await sleep(interval);

    return await retry(fn, {
      retryPredicate,
      exponential,
      interval: exponential ? interval * 2 : interval,
      retriesLeft: retriesLeft - 1,
    });
  }
}
