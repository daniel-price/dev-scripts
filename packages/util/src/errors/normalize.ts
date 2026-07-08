import { TypeValidationError } from "../runtypes/type-validation-error";
import {
  AppError,
  ScriptExecutionError,
  SourceValidationError,
} from "./app-error";
import type { LoggedError } from "./types";
import { summarizeValidation } from "./validation";

function parseErrorStack(error: Error): string[] | undefined {
  if (!error.stack) return undefined;
  const lines = error.stack.split("\n");
  if (lines.length <= 1) return undefined;
  return lines.slice(1).map((line) => line.trim());
}

function normalizeError(
  context: string | undefined,
  error: Error,
): LoggedError {
  const cause =
    error.cause !== undefined
      ? normalizeLoggedError(undefined, error.cause)
      : undefined;

  return {
    context,
    message: error.message,
    name: error.name,
    validation:
      error instanceof TypeValidationError
        ? summarizeValidation(error.validation)
        : undefined,
    source: error instanceof SourceValidationError ? error.source : undefined,
    stderr: error instanceof ScriptExecutionError ? error.stderr : undefined,
    humanReadableDetails:
      error instanceof AppError ? error.humanReadableDetails : undefined,
    humanReadableDetailsBlock:
      error instanceof AppError ? error.humanReadableDetailsBlock : undefined,
    stack: parseErrorStack(error),
    cause,
  };
}

function normalizeUnknownThrownValue(
  context: string | undefined,
  value: unknown,
): LoggedError {
  return {
    context,
    message: context ?? (typeof value === "string" ? value : "Unknown error"),
    name: "NonErrorThrown",
    unknownValue: value,
  };
}

export function normalizeLoggedError(
  context: string | Error | undefined,
  error?: unknown,
): LoggedError {
  if (context instanceof Error && error === undefined) {
    return normalizeError(undefined, context);
  }

  const contextText = typeof context === "string" ? context : undefined;

  if (error === undefined) {
    return {
      message: contextText ?? "Unknown error",
      name: "Error",
    };
  }

  if (error instanceof Error) {
    return normalizeError(contextText, error);
  }

  return normalizeUnknownThrownValue(contextText, error);
}
