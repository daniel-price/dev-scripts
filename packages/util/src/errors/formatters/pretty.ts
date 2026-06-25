import * as Terminal from "../../terminal";
import type { ErrorFormatter, LoggedError } from "../types";

function indent(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n");
}

function formatCauseMessage(cause: LoggedError): string {
  const message = cause.message.trim();
  return message.startsWith("Error:") ? message : `Error: ${message}`;
}

export class PrettyErrorFormatter implements ErrorFormatter {
  format(error: LoggedError): string {
    const stream = process.stderr;
    const header = error.context ?? error.message;
    const parts = [
      `${Terminal.red("[ERROR]", stream)} ${Terminal.red(header, stream)}`,
    ];

    const showDomainMessage =
      error.context !== undefined && error.message !== error.context;
    const details = error.humanReadableDetails;

    if (showDomainMessage) {
      parts.push("", "caused by:", `  ${error.message}`);
    }

    if (details) {
      if (showDomainMessage) {
        parts.push("");
      }
      parts.push(
        error.humanReadableDetailsBlock ? details : indent(details, 2),
      );
    }

    if (error.cause) {
      parts.push("", "caused by:", formatCauseMessage(error.cause));
    }

    if (error.stack && error.stack.length > 0) {
      parts.push("");
      parts.push("  Stack:");
      parts.push(
        Terminal.dim(
          error.stack.map((line) => `    ${line}`).join("\n"),
          stream,
        ),
      );
    }

    return parts.join("\n");
  }
}

export const prettyErrorFormatter = new PrettyErrorFormatter();
