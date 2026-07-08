import { formatSourceDetails } from "./source-human";
import type { AppErrorDetails } from "./types";

export type AppErrorJson = {
  name: string;
  message: string;
  details?: AppErrorDetails;
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

function humanReadableDetailsFor(
  details: AppErrorDetails,
  cause?: unknown,
): { text: string; block: boolean } {
  const causeMessage = getCauseMessage(cause);

  switch (details.kind) {
    case "execute":
      return { text: details.stderr, block: false };
    case "source":
      return {
        text: formatSourceDetails(details, causeMessage),
        block: true,
      };
    case "unknown":
      return {
        text:
          typeof details.value === "string"
            ? details.value
            : JSON.stringify(details.value),
        block: false,
      };
    case "validation":
      throw new Error(
        "Validation details require a domain error such as TypeValidationError",
      );
    default: {
      const _exhaustive: never = details;
      return { text: String(_exhaustive), block: false };
    }
  }
}

export class AppError extends Error {
  readonly details?: AppErrorDetails;
  readonly humanReadableDetails?: string;
  readonly humanReadableDetailsBlock: boolean;

  constructor(
    message: string,
    options?: {
      details?: AppErrorDetails;
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
    } else if (options?.details) {
      const rendered = humanReadableDetailsFor(options.details, options.cause);
      this.humanReadableDetails = rendered.text;
      this.humanReadableDetailsBlock = rendered.block;
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
  constructor(
    message: string,
    details: Exclude<AppErrorDetails, { kind: "validation" }>,
    options?: { cause?: unknown },
  ) {
    super(message, {
      details,
      cause: options?.cause,
    });
    this.name = "ValidationError";
  }
}

export class ScriptExecutionError extends AppError {
  override readonly humanReadableDetails: string;

  constructor(message: string, stderr: string, options?: { cause?: unknown }) {
    super(message, {
      details: { kind: "execute", stderr },
      humanReadableDetails: stderr,
      cause: options?.cause,
    });
    this.name = "ScriptExecutionError";
    this.humanReadableDetails = stderr;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
