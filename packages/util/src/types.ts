import { isNonNil } from "./util";

export type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

export type RequiredFields<T, K extends keyof T> = Prettify<
  T & {
    [P in K]-?: NonNullable<T[P]>;
  }
>;

export function ensureFieldsSet<T, K extends keyof T>(
  obj: T,
  fields: K[],
): RequiredFields<T, K> {
  return fields.reduce(
    (acc, field) => {
      if (isNonNil(obj[field])) {
        return { ...acc, [field]: obj[field] };
      }
      throw new Error(`${String(field)} is not defined`);
    },
    {} as RequiredFields<T, K>,
  );
}
