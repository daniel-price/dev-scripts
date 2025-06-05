export function unique<T>(array: Array<T>): Array<T> {
  const res: T[] = [];
  for (let i = 0; i < array.length; i++) {
    if (res.indexOf(array[i]) === -1) {
      res.push(array[i]);
    }
  }
  return res;
}

export function chunk<T>(inputArray: T[], perChunk: number): T[][] {
  return inputArray.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, new Array<T[]>());
}
