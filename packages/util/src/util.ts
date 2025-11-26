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
  return Bun.sleep(ms);
}

export function pickKeys<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in item) {
      result[key] = item[key];
    }
  }
  return result;
}
