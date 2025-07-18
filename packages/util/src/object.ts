export function removeUndefinedValues<T>(
  object: Record<string, T | undefined>,
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
