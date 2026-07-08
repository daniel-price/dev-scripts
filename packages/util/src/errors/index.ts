import { jsonErrorFormatter, prettyErrorFormatter } from "./formatters";
import type { ErrorFormatter } from "./types";

export type { AppErrorJson } from "./app-error";
export {
  AppError,
  isAppError,
  ScriptExecutionError,
  SourceValidationError,
  ValidationError,
} from "./app-error";
export {
  formatError,
  formatErrorHuman,
  formatErrorJson,
  JsonErrorFormatter,
  jsonErrorFormatter,
  PrettyErrorFormatter,
  prettyErrorFormatter,
} from "./formatters";
export { logAppError, logError } from "./log-error";
export { normalizeLoggedError } from "./normalize";
export * from "./types";
export * from "./validation";

export function getErrorFormatter(): ErrorFormatter {
  if (process.env.LOG_FORMAT === "json") {
    return jsonErrorFormatter;
  }
  if (process.env.NODE_ENV === "production") {
    return jsonErrorFormatter;
  }
  return prettyErrorFormatter;
}
