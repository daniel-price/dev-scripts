import type {
  ArgField,
  ArgRuntype,
  ArgSchema,
  InferArgs,
  ValidateArgField,
  ValidateArgSchema,
} from "./args";
import type { ScriptEnv, ScriptEnvValues } from "./env";

type RunFunction<A extends ArgSchema, E extends ScriptEnv> = (
  args: InferArgs<A>,
  env: ScriptEnvValues<E>,
) => Promise<void>;

export type ScriptConfig<A extends ArgSchema, E extends ScriptEnv> = {
  args?: A;
  env?: E;
  help?: () => string;
  run: RunFunction<A, E>;
};

type InferArgRuntype<F> = F extends { type: infer T extends ArgRuntype }
  ? T
  : never;

export function defineScript<
  const A extends ArgSchema &
    ValidateArgSchema<A> & {
      [K in keyof A]: ValidateArgField<A[K], ArgField<InferArgRuntype<A[K]>>>;
    } = Record<string, never>,
  E extends ScriptEnv = ScriptEnv,
>(config: {
  args?: A;
  env?: E;
  help?: () => string;
  run: (args: InferArgs<A>, env: ScriptEnvValues<E>) => Promise<void>;
}): ScriptConfig<A, E> {
  return config;
}

export type AnyScriptConfig = ScriptConfig<ArgSchema, ScriptEnv>;
