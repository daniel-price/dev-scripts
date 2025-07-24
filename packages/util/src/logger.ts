import moize from "moize";

import * as Enum from "./enum";

type T_ExecuteError = { stderr: string };

const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
} as const;

type LogLevels = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

function isExecuteError(e: unknown): e is T_ExecuteError {
  if (!e) return false;
  if (typeof e !== "object") return false;
  return Object.hasOwn(e, "stderr");
}

export function error(context: string, e?: unknown): void {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;
  if (!e) {
    console.error(context); // eslint-disable-line no-console
    return;
  }

  if (isExecuteError(e)) {
    console.error(context, e.stderr); // eslint-disable-line no-console
    return;
  }

  if (e instanceof Error) {
    console.error(context, e, e.cause ?? ""); // eslint-disable-line no-console
    return;
  }

  if (typeof e === "object") {
    console.error(context, e); // eslint-disable-line no-console
    return;
  }

  if (typeof e === "string") {
    console.error(context, e); // eslint-disable-line no-console
    return;
  }

  console.error("Logging unknown error type:", typeof e); // eslint-disable-line no-console
  console.error(context, e); // eslint-disable-line no-console
  return;
}

const envLogLevel = moize(() => {
  const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
  const logLevelIsEnum = Enum.isEnumValue(envLogLevel, LOG_LEVELS);
  if (logLevelIsEnum) {
    return LOG_LEVELS[envLogLevel];
  }

  // eslint-disable-next-line no-console
  console.error("unknown log level - using INFO", envLogLevel);
  return LOG_LEVELS.INFO;
});

function shouldLog(logLevel: LogLevels): boolean {
  const envLogLevelEnum = envLogLevel();
  return logLevel >= envLogLevelEnum;
}

export function debug(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;
  // const expandedArgs = expandArrayArgs(args)
  console.debug("\n", ...args); // eslint-disable-line no-console
}

export function warn(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.WARN)) return;
  // const expandedArgs = expandArrayArgs(args)
  console.warn("\n", ...args); // eslint-disable-line no-console
}

export function info(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.INFO)) return;
  // const expandedArgs = expandArrayArgs(args)
  console.info("\n", ...args); // eslint-disable-line no-console
}
