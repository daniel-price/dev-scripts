import { InstanceOf, Null, Runtype, Static, Unknown } from "runtypes";
import { RuntypeBase } from "runtypes/lib/runtype";

export * from "runtypes";
export type RunTypeBase = RuntypeBase;

export function assertType<T>(runtype: Runtype<T>, actualData: unknown): T {
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
): Runtype<Set<Static<typeof element>>> {
  return InstanceOf(Set).withGuard(
    (x: Set<unknown>): x is Set<Static<typeof element>> =>
      [...x].every(element.guard),
  );
}

export function MapOf<E extends RuntypeBase, V extends RuntypeBase>(
  key: E,
  value: V,
): Runtype<Map<Static<typeof key>, Static<typeof value>>> {
  return InstanceOf(Map).withGuard(
    (x: Map<unknown, unknown>): x is Map<Static<typeof key>, typeof value> =>
      Object.entries(x).every(([k, v]) => key.guard(k) && value.guard(v)),
  );
}
export function runtypeFromEnum<EnumType>(
  enum_: Record<string, EnumType>,
): Runtype<EnumType> {
  const values = Object.values<unknown>(enum_);
  const isEnumValue = (input: unknown): input is EnumType =>
    values.includes(input);
  const errorMessage = (input: unknown): string =>
    `Failed constraint check. Expected one of ${JSON.stringify(
      values,
    )}, but received ${JSON.stringify(input)}`;
  return Unknown.withConstraint<EnumType>(
    (object: unknown) => isEnumValue(object) || errorMessage(object),
  );
}

export function Nullable<R extends Runtype>(
  runtype: R,
): Runtype<Static<R> | null> {
  return runtype.Or(Null);
}
