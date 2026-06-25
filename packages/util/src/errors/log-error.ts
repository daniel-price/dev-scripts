import { isAppError } from "./app-error";
import { formatError } from "./formatters";
import { normalizeLoggedError } from "./normalize";

export function logError(error: unknown, context?: string): void {
  process.stderr.write(`${formatError(error, context)}\n`);
}

export function logAppError(
  context: string | import("./app-error").AppError,
  error?: unknown,
): void {
  if (isAppError(context) && error === undefined) {
    process.stderr.write(`${formatError(context)}\n`);
    return;
  }

  process.stderr.write(`${formatError(error, context as string)}\n`);
}

export { normalizeLoggedError };
