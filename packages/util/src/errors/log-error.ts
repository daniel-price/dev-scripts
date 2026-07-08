import { Json } from "../..";
import { formatError } from "./formatters";
import { normalizeLoggedError } from "./normalize";

export function logError(error: unknown, context?: string): void {
  process.stderr.write(`${formatError(error, context)}\n`);
}

export function logAppError(
  context: string | import("./app-error").AppError,
  error?: unknown,
  data?: Record<string, unknown>,
): void {
  process.stderr.write(
    `${formatError(error, context as string)}\n${
      data ? Json.stringify(data) : ""
    }\n`,
  );
}

export { normalizeLoggedError };
