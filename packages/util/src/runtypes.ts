import * as R from "runtypes";
import { RuntypeBase } from "runtypes/lib/runtype";

export * from "runtypes";
export type RunTypeBase = RuntypeBase;

export function assertType<T>(runtype: R.Runtype<T>, actualData: unknown): T {
  const result = runtype.validate(actualData);
  const { success } = result;
  if (success) {
    const { value } = result;
    return value;
  }

  const { details } = result;

  throw new Error("Data does not match expected type", {
    cause: {
      actualData,
      expectedType: runtype.toString(),
      details: Array.isArray(details) ? details?.filter((d) => d) : details,
    },
  });
}

export function SetOf<E extends RuntypeBase>(
  element: E,
): R.Runtype<Set<R.Static<typeof element>>> {
  return R.InstanceOf(Set).withGuard(
    (x: Set<unknown>): x is Set<R.Static<typeof element>> =>
      [...x].every(element.guard),
  );
}

export function MapOf<E extends RuntypeBase, V extends RuntypeBase>(
  key: E,
  value: V,
): R.Runtype<Map<R.Static<typeof key>, R.Static<typeof value>>> {
  return R.InstanceOf(Map).withGuard(
    (x: Map<unknown, unknown>): x is Map<R.Static<typeof key>, typeof value> =>
      Object.entries(x).every(([k, v]) => key.guard(k) && value.guard(v)),
  );
}
export function runtypeFromEnum<EnumType>(
  enum_: Record<string, EnumType>,
): R.Runtype<EnumType> {
  const values = Object.values<unknown>(enum_);
  const isEnumValue = (input: unknown): input is EnumType =>
    values.includes(input);
  const errorMessage = (input: unknown): string =>
    `Failed constraint check. Expected one of ${JSON.stringify(
      values,
    )}, but received ${JSON.stringify(input)}`;
  return R.Unknown.withConstraint<EnumType>(
    (object: unknown) => isEnumValue(object) || errorMessage(object),
  );
}

export function Nullable<R extends R.Runtype>(
  runtype: R,
): R.Runtype<R.Static<R> | null> {
  return runtype.Or(R.Null);
}
