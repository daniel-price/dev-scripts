import { Clipboard, Prompt, R } from "@dev/util";
import { HasDefault } from "@dev/util/src/types";

export type ArgRuntype = Parameters<typeof R.Record>[0][string];

/** Use as `default: clipboard` on required string args to read the initial value from the clipboard. */
export const clipboard = Symbol("clipboard");

export function isClipboardDefault(value: unknown): value is typeof clipboard {
  return value === clipboard;
}

type RequiredArgDefault<Inner extends ArgRuntype> = [R.Static<Inner>] extends [
  string,
]
  ? typeof clipboard
  : never;

type OptionalArgFieldFor<Inner extends ArgRuntype> = {
  default?: R.Static<Inner>;
};

type RequiredArgFieldFor<Inner extends ArgRuntype = ArgRuntype> = {
  default?: RequiredArgDefault<Inner>;
};

type ArgFieldConstraints<Inner extends ArgRuntype = ArgRuntype> =
  | RequiredArgFieldFor<Inner>
  | OptionalArgFieldFor<Inner>;

type CommonArgFields<T> = {
  type: T;
  description?: string;
  short?: string;
};

export type ArgFieldFor<T extends ArgRuntype> = T extends {
  tag: "optional";
  underlying: infer Inner extends ArgRuntype;
}
  ? OptionalArgFieldFor<Inner>
  : RequiredArgFieldFor<T>;

export type ArgField<T extends ArgRuntype = ArgRuntype> = ArgFieldFor<T> &
  CommonArgFields<T>;

/** Index-signature value type: optional fields are not narrowed via `ArgRuntype`. */
type AnyArgField = CommonArgFields<ArgRuntype> & ArgFieldConstraints;

type ArgFieldUnknownKeysError<Keys> = `unknown argument field key(s): ${Keys &
  string}`;

type ArgFieldDefaultOnRequiredError =
  "default is not allowed on required arguments";

type ArgFieldDefaultMismatchError =
  "default value does not match argument type";

type ArgFieldInvalidError = "invalid argument field configuration";

type ArgFieldShortNotOneCharError = "short flag must be a single character";

type IsSingleChar<S extends string> = S extends ""
  ? false
  : S extends `${infer _}${infer Rest}`
  ? Rest extends ""
    ? true
    : false
  : false;

type ValidateArgFieldShape<T, Shape> = "short" extends keyof T
  ? T["short"] extends string
    ? IsSingleChar<T["short"]> extends false
      ? ArgFieldShortNotOneCharError
      : ValidateArgFieldDefaults<T, Shape>
    : ValidateArgFieldDefaults<T, Shape>
  : ValidateArgFieldDefaults<T, Shape>;

type ValidateArgFieldDefaults<T, Shape> = T extends Shape
  ? T
  : "default" extends keyof T
  ? Shape extends { default?: never }
    ? ArgFieldDefaultOnRequiredError
    : ArgFieldDefaultMismatchError
  : ArgFieldInvalidError;

type ArgSchemaMultipleClipboardDefaultsError =
  "only one argument may use default: clipboard";

type ClipboardDefaultKeys<A extends ArgSchema> = {
  [K in keyof A]: A[K] extends { default: typeof clipboard } ? K : never;
}[keyof A];

type IsUnion<T, U = T> = T extends U ? ([U] extends [T] ? false : true) : false;

type ShortOf<F> = F extends { short: infer S extends string } ? S : never;

type KeysShareShort<
  A extends ArgSchema,
  K extends keyof A,
  L extends keyof A,
> = K extends L
  ? false
  : [ShortOf<A[K]>] extends [never]
  ? false
  : [ShortOf<A[L]>] extends [never]
  ? false
  : [ShortOf<A[K]>] extends [ShortOf<A[L]>]
  ? [ShortOf<A[L]>] extends [ShortOf<A[K]>]
    ? true
    : false
  : false;

type HasDuplicateShorts<A extends ArgSchema> = true extends {
  [K in keyof A]: {
    [L in keyof A]: KeysShareShort<A, K, L> extends true ? true : never;
  }[keyof A];
}[keyof A]
  ? true
  : false;

type ArgSchemaDuplicateShortFlagsError =
  "multiple arguments may not have the same short flag";

type ValidateUniqueShortFlags<A extends ArgSchema> =
  HasDuplicateShorts<A> extends true
    ? { readonly __argSchemaError__: ArgSchemaDuplicateShortFlagsError }
    : unknown;

type ValidateClipboardDefaults<A extends ArgSchema> = [
  ClipboardDefaultKeys<A>,
] extends [never]
  ? unknown
  : IsUnion<ClipboardDefaultKeys<A>> extends true
  ? { readonly __argSchemaError__: ArgSchemaMultipleClipboardDefaultsError }
  : unknown;

/** Validates arg schema literals, e.g. at most one `default: clipboard`. */
export type ValidateArgSchema<A extends ArgSchema> =
  ValidateClipboardDefaults<A> & ValidateUniqueShortFlags<A>;

/** Validates arg field literals and surfaces descriptive type errors. */
export type ValidateArgField<T, Shape> = Exclude<
  keyof T,
  keyof Shape
> extends infer Unknown
  ? [Unknown] extends [never]
    ? ValidateArgFieldShape<T, Shape>
    : ArgFieldUnknownKeysError<Unknown>
  : never;

export type ArgSchema = Record<string, AnyArgField>;

export type ArgRuntypeSchema<A extends ArgSchema> = {
  [K in keyof A]: A[K]["type"];
};

type InferArgField<F> = F extends { type: infer T extends ArgRuntype }
  ? HasDefault<F> extends true
    ? Exclude<R.Static<T>, undefined>
    : R.Static<T>
  : never;

export type InferArgs<A extends ArgSchema> = {
  [K in keyof A]: InferArgField<A[K]>;
};

export function buildMriOptions(argSchema: ArgSchema): {
  alias: Record<string, string>;
  boolean: string[];
} {
  const alias: Record<string, string> = { h: "help" };
  const boolean = ["help"];

  for (const [name, field] of Object.entries(argSchema)) {
    if (field.short) {
      alias[field.short] = name;
    }
    if (R.isBooleanRuntype(field.type)) {
      boolean.push(name);
    }
  }

  return { alias, boolean };
}

export function pickSchemaArgs(
  argSchema: ArgSchema,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(argSchema)) {
    if (key in args) {
      picked[key] = args[key];
    }
  }
  return picked;
}

function applyDefaults(
  argSchema: ArgSchema,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...args };

  for (const [name, field] of Object.entries(argSchema)) {
    if (name in result) continue;
    if ("default" in field && field.default !== undefined) {
      result[name] = isClipboardDefault(field.default)
        ? Clipboard.get()
        : field.default;
    }
  }

  return result;
}

export async function parseArgs<A extends ArgSchema>(
  argSchema: A,
  args: Record<string, unknown>,
): Promise<InferArgs<A>> {
  const withDefaults = applyDefaults(argSchema, args);

  const requiredArgNames = Object.entries(argSchema)
    .filter(([_, fieldInfo]) => !R.isOptionalRuntype(fieldInfo.type))
    .map(([fieldName, _]) => fieldName);

  for (const requiredField of requiredArgNames) {
    if (!withDefaults[requiredField]) {
      withDefaults[requiredField] = await Prompt.string(
        `Enter ${requiredField}:`,
      );
    }
  }

  const argRuntypeSchema: Record<string, ArgRuntype> = {};
  for (const fieldName of Object.keys(argSchema)) {
    argRuntypeSchema[fieldName] = argSchema[fieldName].type;
  }

  return R.assertType(R.Record(argRuntypeSchema), withDefaults) as InferArgs<A>;
}
