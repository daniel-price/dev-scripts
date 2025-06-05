type RequireLiteral<K extends PropertyKey> = string extends K
  ? never
  : number extends K
    ? never
    : symbol extends K
      ? never
      : K;

export function has<K extends PropertyKey>(
  obj: unknown,
  property: RequireLiteral<K>,
): obj is { [P in K]: { [Q in P]: unknown } }[K] {
  if (!isObject(obj)) {
    return false;
  }

  return property in obj;
}

export function isNonNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && isNonNil(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pickKeys(
  item: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in item) {
      result[key] = item[key];
    }
  }
  return result;
}
