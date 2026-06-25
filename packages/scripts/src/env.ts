import { cleanEnv, RequiredValidatorSpec, str } from "envalid";

const defaultEnv: {
  AWS_REGION: RequiredValidatorSpec<string>;
} = {
  AWS_REGION: str(),
};

export type ScriptEnv = Record<string, RequiredValidatorSpec<unknown>>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getCleanedEnv<T extends ScriptEnv>(optionalEnv?: T) {
  return cleanEnv(process.env, { ...defaultEnv, ...(optionalEnv || {}) });
}

export type ScriptEnvValues<T extends ScriptEnv> = {
  [K in keyof T]: T[K] extends RequiredValidatorSpec<infer V> ? V : never;
} & ReturnType<typeof getCleanedEnv>;

export { bool, email, host, json, num, port, str, url } from "envalid";
