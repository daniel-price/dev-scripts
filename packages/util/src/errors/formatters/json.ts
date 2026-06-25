import type { ErrorFormatter, LoggedError } from "../types";

export class JsonErrorFormatter implements ErrorFormatter {
  format(error: LoggedError): string {
    return JSON.stringify({
      level: "error",
      ...error,
    });
  }
}

export const jsonErrorFormatter = new JsonErrorFormatter();
