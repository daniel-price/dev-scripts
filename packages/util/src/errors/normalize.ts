import { AppError, isAppError } from "./app-error";
import type {
  AppErrorDetails,
  LoggedError,
  NormalizedErrorData,
} from "./types";
import { isValidationErrorData, summarizeValidation } from "./validation";

function isRawErrorData(value: unknown): value is AppErrorDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof value.kind === "string"
  );
}

export function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return undefined;
}

function parseErrorStack(error: Error): string[] | undefined {
  if (!error.stack) return undefined;
  const lines = error.stack.split("\n");
  if (lines.length <= 1) return undefined;
  return lines.slice(1).map((line) => line.trim());
}

function normalizeRawErrorData(
  value: unknown,
): NormalizedErrorData | undefined {
  if (!isRawErrorData(value)) return undefined;

  switch (value.kind) {
    case "validation":
      return summarizeValidation(value);
    case "execute":
    case "source":
    case "unknown":
      return value;
  }
}

function normalizeAppError(
  context: string | undefined,
  error: AppError,
): LoggedError {
  const cause =
    error.cause !== undefined
      ? normalizeLoggedError(undefined, error.cause)
      : undefined;

  return {
    context,
    message: error.message,
    name: error.name,
    data: error.details ? normalizeRawErrorData(error.details) : undefined,
    humanReadableDetails: error.humanReadableDetails,
    humanReadableDetailsBlock: error.humanReadableDetailsBlock,
    stack: parseErrorStack(error),
    cause,
  };
}

function normalizeError(
  context: string | undefined,
  error: Error,
): LoggedError {
  const absorbedData =
    error.cause !== undefined ? normalizeRawErrorData(error.cause) : undefined;

  const nestedCause =
    error.cause instanceof Error
      ? normalizeLoggedError(undefined, error.cause)
      : undefined;

  return {
    context,
    message: error.message,
    name: error.name,
    data: absorbedData,
    stack: parseErrorStack(error),
    cause: nestedCause,
  };
}

export function normalizeLoggedError(
  context: string | AppError | undefined,
  error?: unknown,
): LoggedError {
  if (isAppError(context)) {
    return normalizeAppError(undefined, context);
  }

  if (error === undefined) {
    return {
      message: context ?? "Unknown error",
      name: "Error",
    };
  }

  if (isAppError(error)) {
    return normalizeAppError(context, error);
  }

  if (error instanceof Error) {
    return normalizeError(context, error);
  }

  if (typeof error === "string") {
    return {
      context,
      message: context ?? error,
      name: "Error",
      data: { kind: "unknown", value: error },
    };
  }

  return {
    context,
    message: context ?? "Unknown error",
    name: "Error",
    data: { kind: "unknown", value: error },
  };
}

export { isValidationErrorData };
