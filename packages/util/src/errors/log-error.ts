import { formatError } from "./formatters";
import { normalizeLoggedError } from "./normalize";

export function logError(error: unknown, context: string): void {
  process.stderr.write(`${formatError(error, context)}\n`);
}

export function logAppError(
  context: string,
  error?: unknown,
  data?: Record<string, unknown>,
): void {
  process.stderr.write(
    `${formatError(error, context)}\n${
      data ? JSON.stringify(data, undefined, 2) : ""
    }\n`,
  );
}

export { normalizeLoggedError };
