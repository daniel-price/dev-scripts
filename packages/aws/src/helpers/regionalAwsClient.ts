import { awsProxy } from "./awsProxy";

/** Resolves region from an explicit value or standard AWS environment variables. */
export function resolveAwsRegion(explicit?: string): string {
  const r =
    explicit ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (!r) {
    throw new Error(
      "AWS region is required: pass `region` or set AWS_REGION / AWS_DEFAULT_REGION",
    );
  }
  return r;
}

/**
 * Returns a function that yields one {@link awsProxy}-wrapped client per region.
 * Each call gets its own cache so different SDK clients never share entries.
 */
export function regionalAwsClient<T extends object>(
  ClientCtor: new (config: { region: string }) => T,
): (region: string) => T {
  const byRegion = new Map<string, T>();
  return (region: string) => {
    const existing = byRegion.get(region);
    if (existing) return existing;
    const client = awsProxy(new ClientCtor({ region }));
    byRegion.set(region, client);
    return client;
  };
}
