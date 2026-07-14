import * as R from "runtypes";

import { TypeValidationError } from "./runtypes/type-validation-error";
import { isObject } from "./util";

export { TypeValidationError } from "./runtypes/type-validation-error";
export * from "runtypes";
export type RunTypeBase = R.Runtype.Core;

export function isOptionalRuntype(type: R.Runtype.Core | R.Optional): boolean {
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

export function assertType<T>(
  runtype: R.Runtype.Core<T>,
  actualData: unknown,
  parse = false,
): T {
  // Validate only, don't parse: v7 parsing transforms the value (e.g. `Object`
  // strips undeclared keys), whereas we want the original data back unchanged,
  // matching v6 `.validate()` semantics.
  const result = runtype.inspect(actualData, { parse });
  if (result.success) {
    return result.value;
  }

  const details = "details" in result ? result.details : undefined;

  throw new TypeValidationError({
    kind: "validation",
    expectedType: runtype.toString(),
    actualData,
    details,
  });
}

export function SetOf<E extends R.Runtype.Core>(
  element: E,
): R.Runtype.Core<Set<R.Static<typeof element>>> {
  return R.InstanceOf(Set).withGuard(
    (x: Set<unknown>): x is Set<R.Static<typeof element>> =>
      [...x].every((item) => element.guard(item)),
  );
}

export function MapOf<E extends R.Runtype.Core, V extends R.Runtype.Core>(
  key: E,
  value: V,
): R.Runtype.Core<Map<R.Static<typeof key>, R.Static<typeof value>>> {
  return R.InstanceOf(Map).withGuard(
    (
      x: Map<unknown, unknown>,
    ): x is Map<R.Static<typeof key>, R.Static<typeof value>> =>
      [...x.entries()].every(([k, v]) => key.guard(k) && value.guard(v)),
  );
}
export function runtypeFromEnum<EnumType>(
  enum_: Record<string, EnumType>,
): R.Runtype.Core<EnumType> {
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

export function Nullable<T extends R.Runtype>(
  runtype: T,
): R.Runtype.Core<R.Static<T> | null> {
  return runtype.or(R.Null);
}
