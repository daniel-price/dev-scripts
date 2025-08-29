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
    if (retriesLeft <= 0 || !retryPredicate(err)) {
      throw err;
    }

    await sleep(interval);

    return await retry(fn, {
      retryPredicate,
      exponential,
      interval: exponential ? interval * 2 : interval,
      retriesLeft: retriesLeft - 1,
    });
  }
}
