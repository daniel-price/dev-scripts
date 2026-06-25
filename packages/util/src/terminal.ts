export function supportsAnsiColor(
  stream: { isTTY?: boolean } = process.stderr,
): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return stream.isTTY === true;
}

function colorize(
  code: string,
  text: string,
  stream: { isTTY?: boolean } = process.stderr,
): string {
  if (!supportsAnsiColor(stream)) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export function dim(
  text: string,
  stream: { isTTY?: boolean } = process.stderr,
): string {
  return colorize("2", text, stream);
}

export function cyan(
  text: string,
  stream: { isTTY?: boolean } = process.stderr,
): string {
  return colorize("36", text, stream);
}

export function yellow(
  text: string,
  stream: { isTTY?: boolean } = process.stderr,
): string {
  return colorize("33", text, stream);
}

export function red(
  text: string,
  stream: { isTTY?: boolean } = process.stderr,
): string {
  return colorize("31", text, stream);
}

export function redBold(text: string): string {
  if (!supportsAnsiColor()) return text;
  return `\x1b[1;31m${text}\x1b[0m`;
}

const SOURCE_ERROR_LOCATION_PATTERNS = [
  /at line (\d+), column (\d+)/i,
  /\bat (\d+):(\d+)(?::(\d+))?/,
];

export type SourceErrorLocation = {
  line: number;
  column: number;
  length: number;
};

export function parseSourceErrorLocation(
  errorMessage: string,
): SourceErrorLocation | undefined {
  for (const pattern of SOURCE_ERROR_LOCATION_PATTERNS) {
    const match = errorMessage.match(pattern);
    if (!match) continue;

    return {
      line: Number(match[1]),
      column: Number(match[2]),
      length: match[3] ? Number(match[3]) : 1,
    };
  }

  return undefined;
}

export function formatSourceWithGutter(
  source: string,
  lineNumber: number,
  column: number,
  length = 1,
): string {
  const lines = source.split("\n");
  const gutterWidth = String(lines.length).length;
  const gutter = (line: number): string =>
    String(line).padStart(gutterWidth, " ");

  const output: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = index + 1;
    output.push(`${gutter(line)} | ${lines[index]}`);

    if (line === lineNumber) {
      const caret =
        " ".repeat(gutterWidth) +
        " | " +
        " ".repeat(Math.max(0, column - 1)) +
        "^".repeat(Math.max(1, length));
      output.push(caret);
    }
  }

  return output.join("\n");
}

export function highlightSourceFromErrorMessage(
  source: string,
  errorMessage: string,
): string | undefined {
  const location = parseSourceErrorLocation(errorMessage);
  if (!location) return undefined;

  const { line, column, length } = location;
  const lines = source.split("\n");
  if (!lines[line - 1]) return undefined;

  if (supportsAnsiColor()) {
    return formatSourceLocation(lines, line, column, length).join("\n");
  }

  return formatSourceWithGutter(source, line, column, length);
}

export function formatSourceLocation(
  lines: string[],
  lineNumber: number,
  column: number,
  length = 1,
): string[] {
  const lineIndex = lineNumber - 1;
  const line = lines[lineIndex];
  if (!line) return lines;

  const start = Math.max(0, column - 1);
  const spanLength = Math.max(1, length);

  if (supportsAnsiColor()) {
    const highlighted =
      line.slice(0, start) +
      redBold(line.slice(start, start + spanLength)) +
      line.slice(start + spanLength);

    return [
      ...lines.slice(0, lineIndex),
      highlighted,
      ...lines.slice(lineIndex + 1),
    ];
  }

  const caret = " ".repeat(start) + "^".repeat(spanLength);
  return [
    ...lines.slice(0, lineIndex),
    line,
    caret,
    ...lines.slice(lineIndex + 1),
  ];
}
