import * as Terminal from "../terminal";

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
  sourceText: string,
  causeMessage?: string,
): string {
  const source = sourceText.trimEnd();
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
