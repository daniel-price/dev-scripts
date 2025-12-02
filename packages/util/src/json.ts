import * as Logger from "./logger";
import * as R from "./runtypes";

export function stringify(
  obj:
    | object
    | Array<Record<string, unknown> | string>
    | string
    | Map<string, unknown>,
  prettyPrint = true,
): string {
  try {
    if (typeof obj === "string") return obj;
    if (prettyPrint) return JSON.stringify(obj, replacer, 2);
    return JSON.stringify(obj);
  } catch (e) {
    Logger.error("Unable to stringify json", obj);
    return "--NULL--";
  }
}

export function parse<T>(jsonString: string, runtype: R.Runtype<T>): T {
  try {
    const parsed = JSON.parse(jsonString, reviver);
    return R.assertType(runtype, parsed);
  } catch (e) {
    Logger.error("Unable to parse json string", {
      jsonString,
      type: typeof jsonString,
      runtype,
    });
    throw e;
  }
}

export function parseArray<T>(
  jsonString: string,
  runtype: R.Runtype<T>,
): Array<T> {
  const result = parse(jsonString, R.Array(runtype));
  if (!Array.isArray(result))
    throw new Error("Parsed json string but it is not an array");
  return result;
}

function replacer(
  _key: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()),
    };
  }

  if (value instanceof Set) {
    return {
      dataType: "Set",
      value: Array.from(value),
    };
  }

  return value;
}

function reviver(
  _key: string,
  value: Record<string, unknown>,
): Record<string, unknown> | Map<unknown, unknown> | Set<unknown> {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map" && Array.isArray(value.value)) {
      return new Map(value.value);
    }

    if (value.dataType === "Set" && Array.isArray(value.value)) {
      return new Set(value.value);
    }
  }
  return value;
}
