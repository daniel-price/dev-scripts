import moize from "moize";
import util from "util";

import * as Enum from "./enum";
import { logAppError } from "./errors/log-error";
import * as Terminal from "./terminal";

export {
  AppError,
  formatError,
  formatErrorHuman,
  formatErrorJson,
  isAppError,
  logError,
  ScriptExecutionError,
  SourceValidationError,
  ValidationError,
} from "./errors";
export { TypeValidationError } from "./runtypes";

const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
} as const;

type LogLevels = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

util.inspect.defaultOptions.maxArrayLength = null; //prevent "... X more items"

function formatArgs(args: unknown[], stream: NodeJS.WriteStream): string {
  const colors = Terminal.supportsAnsiColor(stream);
  return args
    .map((a) => {
      if (typeof a === "object" && a !== null) {
        return util.inspect(a, { depth: null, colors });
      }
      return String(a);
    })
    .join(" ");
}

function writeLog(
  stream: NodeJS.WriteStream,
  label: string,
  formatLabel: (text: string) => string,
  args: unknown[],
): void {
  const message = formatArgs(args, stream);
  stream.write(`${formatLabel(`[${label}]`)} ${message}\n`);
}

export function error(
  context: string,
  e?: unknown,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;

  logAppError(context, e, data);
}

const envLogLevel = moize(() => {
  const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
  const logLevelIsEnum = Enum.isEnumValue(envLogLevel, LOG_LEVELS);
  if (logLevelIsEnum) {
    return LOG_LEVELS[envLogLevel];
  }

  const stream = process.stderr;
  stream.write(
    `${Terminal.yellow("[WARN]", stream)} unknown log level - using INFO ${
      envLogLevel ?? ""
    }\n`,
  );
  return LOG_LEVELS.INFO;
});

function shouldLog(logLevel: LogLevels): boolean {
  const envLogLevelEnum = envLogLevel();
  return logLevel >= envLogLevelEnum;
}

export function debug(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;
  const stream = process.stderr;
  const message = formatArgs(args, stream);
  stream.write(`${Terminal.dim(`[DEBUG] ${message}`, stream)}\n`);
}

export function warn(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.WARN)) return;
  writeLog(
    process.stderr,
    "WARN",
    (text) => Terminal.yellow(text, process.stderr),
    args,
  );
}

export function info(...args: unknown[]): void {
  if (!shouldLog(LOG_LEVELS.INFO)) return;
  writeLog(
    process.stdout,
    "INFO",
    (text) => Terminal.cyan(text, process.stdout),
    args,
  );
}
