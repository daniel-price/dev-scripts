import { normalizeLoggedError } from "../normalize";
import { jsonErrorFormatter } from "./json";
import { prettyErrorFormatter } from "./pretty";

export function formatErrorHuman(error: unknown, context: string): string {
  return prettyErrorFormatter.format(normalizeLoggedError(context, error));
}

export function formatErrorJson(error: unknown, context: string): string {
  return jsonErrorFormatter.format(normalizeLoggedError(context, error));
}

function useJsonFormat(): boolean {
  if (process.env.LOG_FORMAT === "json") return true;
  return process.env.NODE_ENV === "production";
}

export function formatError(error: unknown, context: string): string {
  return useJsonFormat()
    ? formatErrorJson(error, context)
    : formatErrorHuman(error, context);
}

export { JsonErrorFormatter, jsonErrorFormatter } from "./json";
export { PrettyErrorFormatter, prettyErrorFormatter } from "./pretty";
