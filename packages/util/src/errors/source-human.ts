import * as Terminal from "../terminal";
import type { SourceErrorData } from "./types";

function parseSourceErrorMessage(message: string): {
  location?: Terminal.SourceErrorLocation;
  errorLine: string;
} {
  const errorText = message.trim();

  return {
    location: Terminal.parseSourceErrorLocation(message),
    errorLine: errorText.startsWith("Error:")
      ? errorText
      : `Error: ${errorText}`,
  };
}

export function formatSourceDetails(
  details: SourceErrorData,
  causeMessage?: string,
): string {
  const source = details.source.trimEnd();
  if (causeMessage === undefined) return source;

  const parsed = parseSourceErrorMessage(causeMessage);
  if (parsed.location) {
    const { line, column, length } = parsed.location;
    return Terminal.formatSourceWithGutter(source, line, column, length);
  }

  const highlighted = Terminal.highlightSourceFromErrorMessage(
    source,
    causeMessage,
  );
  if (highlighted) {
    return highlighted;
  }

  return `${parsed.errorLine}\n\n${source}`;
}
