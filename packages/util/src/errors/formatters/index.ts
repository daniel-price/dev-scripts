import { isAppError } from "../app-error";
import { normalizeLoggedError } from "../normalize";
import { jsonErrorFormatter } from "./json";
import { prettyErrorFormatter } from "./pretty";

function defaultContext(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function formatErrorHuman(error: unknown, context?: string): string {
  return prettyErrorFormatter.format(
    normalizeLoggedError(context ?? defaultContext(error), error),
  );
}

export function formatErrorJson(error: unknown, context?: string): string {
  return jsonErrorFormatter.format(
    normalizeLoggedError(context ?? defaultContext(error), error),
  );
}

function useJsonFormat(): boolean {
  if (process.env.LOG_FORMAT === "json") return true;
  return process.env.NODE_ENV === "production";
}

export function formatError(error?: unknown, context?: string): string {
  if (isAppError(error) && context === undefined) {
    return useJsonFormat() ? formatErrorJson(error) : formatErrorHuman(error);
  }

  return useJsonFormat()
    ? formatErrorJson(error, context)
    : formatErrorHuman(error, context);
}

export { JsonErrorFormatter, jsonErrorFormatter } from "./json";
export { PrettyErrorFormatter, prettyErrorFormatter } from "./pretty";
