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
}

export async function* map<T, R>(
  asyncGenerator: AsyncGenerator<T>,
  mapFn: (item: T) => R,
): AsyncGenerator<R> {
  for await (const item of asyncGenerator) {
    yield mapFn(item);
  }
}
