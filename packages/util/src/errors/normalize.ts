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
    error.cause !== undefined ? normalizeCause(error.cause) : undefined;

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

function normalizeCause(cause: unknown): LoggedError {
  if (cause instanceof Error) {
    return normalizeError(undefined, cause);
  }

  return normalizeUnknownThrownValue(undefined, cause);
}

export function normalizeLoggedError(
  context: string,
  error: unknown,
): LoggedError {
  if (error === undefined) {
    return {
      context,
      message: context,
      name: "Error",
    };
  }

  if (error instanceof Error) {
    return normalizeError(context, error);
  }

  return normalizeUnknownThrownValue(context, error);
}
