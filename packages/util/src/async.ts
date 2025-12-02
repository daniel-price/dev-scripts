import * as Logger from "./logger";

export async function* batch<T>(
  asyncGenerator: AsyncGenerator<T>,
  batchSize: number,
): AsyncGenerator<T[]> {
  let batch: T[] = [];
  for await (const item of asyncGenerator) {
    batch.push(item);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length) yield batch; //yield remaining items even if they are smaller than batchSize
}

export async function* map<T, R>(
  asyncGenerator: AsyncGenerator<T>,
  mapFn: (item: T) => R,
): AsyncGenerator<R> {
  for await (const item of asyncGenerator) {
    yield mapFn(item);
  }
}

export async function* filter<T>(
  asyncGenerator: AsyncGenerator<T>,
  filterFn: (item: T) => boolean,
): AsyncGenerator<T> {
  for await (const item of asyncGenerator) {
    if (filterFn(item)) {
      yield item;
    }
  }
}

export async function log<T>(asyncGenerator: AsyncGenerator<T>): Promise<void> {
  for await (const item of asyncGenerator) {
    Logger.info(item);
  }
}
