import * as R from "runtypes";
import { RuntypeBase } from "runtypes/lib/runtype";

import { TypeValidationError } from "./runtypes/type-validation-error";
import { isObject } from "./util";

export { TypeValidationError } from "./runtypes/type-validation-error";
export * from "runtypes";
export type RunTypeBase = RuntypeBase;

export function isOptionalRuntype(type: RuntypeBase): boolean {
  return isObject(type) && "tag" in type && type.tag === "optional";
}

export function getRuntypeTag(type: unknown): string | undefined {
  if (!isObject(type) || !("tag" in type)) return undefined;

  if (
    type.tag === "optional" &&
    isObject(type.underlying) &&
    "tag" in type.underlying &&
    typeof type.underlying.tag === "string"
  ) {
    return type.underlying.tag;
  }

  return typeof type.tag === "string" ? type.tag : undefined;
}

export function isBooleanRuntype(type: unknown): boolean {
  return getRuntypeTag(type) === "boolean";
}

export function assertType<T>(runtype: R.Runtype<T>, actualData: unknown): T {
  const result = runtype.validate(actualData);
  const { success } = result;
  if (success) {
    const { value } = result;
    return value;
  }

  const { details } = result;

  throw new TypeValidationError({
    kind: "validation",
    expectedType: runtype.toString(),
    actualData,
    details,
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
