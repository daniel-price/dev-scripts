import { formatSourceDetails } from "./source-human";
import type { ValidationErrorData } from "./types";

export type AppErrorJson = {
  name: string;
  message: string;
  details?: ValidationErrorData;
  humanReadableDetails?: string;
  stack?: string;
  cause?: unknown;
};

function serializeCause(cause: unknown): unknown {
  if (cause instanceof AppError) {
    return cause.toJSON();
  }

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      cause: cause.cause,
    };
  }

  return cause;
}

function getCauseMessage(cause: unknown): string | undefined {
  return cause instanceof Error ? cause.message : undefined;
}

export class AppError extends Error {
  readonly details?: ValidationErrorData;
  readonly humanReadableDetails?: string;
  readonly humanReadableDetailsBlock: boolean;

  constructor(
    message: string,
    options?: {
      details?: ValidationErrorData;
      humanReadableDetails?: string;
      humanReadableDetailsBlock?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.details = options?.details;

    if (options?.humanReadableDetails !== undefined) {
      this.humanReadableDetails = options.humanReadableDetails;
      this.humanReadableDetailsBlock =
        options.humanReadableDetailsBlock ?? false;
    } else {
      this.humanReadableDetailsBlock = false;
    }
  }

  toJSON(): AppErrorJson {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
      humanReadableDetails: this.humanReadableDetails,
      stack: this.stack,
      cause: serializeCause(this.cause),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "ValidationError";
  }
}

export class SourceValidationError extends AppError {
  readonly source: string;

  constructor(message: string, source: string, options?: { cause?: unknown }) {
    super(message, {
      humanReadableDetails: formatSourceDetails(
        source,
        getCauseMessage(options?.cause),
      ),
      humanReadableDetailsBlock: true,
      cause: options?.cause,
    });
    this.name = "SourceValidationError";
    this.source = source;
  }
}

export class ScriptExecutionError extends AppError {
  readonly stderr: string;
  override readonly humanReadableDetails: string;

  constructor(message: string, stderr: string, options?: { cause?: unknown }) {
    super(message, {
      humanReadableDetails: stderr,
      cause: options?.cause,
    });
    this.name = "ScriptExecutionError";
    this.stderr = stderr;
    this.humanReadableDetails = stderr;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
