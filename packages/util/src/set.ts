export function difference<T>(
  a: Set<T>,
  b: Set<T>,
): { inBButNotA: T[]; inAButNotB: T[] } {
  const inAButNotB = [...a].filter((value) => !b.has(value));
  const inBButNotA = [...b].filter((value) => !a.has(value));
  return { inAButNotB, inBButNotA };
}
