export function enumToMap(
  enumeration: Record<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const key in enumeration) {
    // TypeScript does not allow enum keys to be numeric
    if (!Number.isNaN(Number(key))) continue;

    const val = enumeration[key] as string;

    // TypeScript does not allow enum value to be null or undefined
    if (val !== undefined && val !== null) map.set(key, val);
  }

  return map;
}

export function isEnumValue<T extends { [k: number]: string }>(
  something: unknown,
  enumObject: T,
): something is T[keyof T] {
  return (
    typeof something === "string" && Object.keys(enumObject).includes(something)
  );
}
