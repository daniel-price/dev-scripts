import util from "util";

import type {
  InvalidItemGroup,
  ValidationArraySummary,
  ValidationErrorData,
  ValidationFallbackSummary,
  ValidationSummary,
} from "./types";

export const MAX_INVALID_GROUPS = 15;
const MAX_DETAIL_TYPES = 15;

export function isValidationErrorData(
  value: unknown,
): value is ValidationErrorData {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "validation" &&
    "expectedType" in value &&
    typeof value.expectedType === "string" &&
    "actualData" in value
  );
}

function collectDetailMessages(
  detail: unknown,
  unwrapSingleStringField: boolean,
): string[] {
  if (detail == null) return [];
  if (typeof detail === "string") return [detail];
  if (typeof detail !== "object") return [String(detail)];

  const messages: string[] = [];
  const stack: Array<{
    value: unknown;
    unwrapSingle: boolean;
    path: string[];
  }> = [{ value: detail, unwrapSingle: unwrapSingleStringField, path: [] }];

  while (stack.length > 0) {
    const { value, unwrapSingle, path } = stack.pop()!;

    if (value == null) continue;

    if (typeof value === "string") {
      messages.push(path.length > 0 ? `${path.join(": ")}: ${value}` : value);
      continue;
    }

    if (typeof value !== "object") {
      const text = String(value);
      messages.push(path.length > 0 ? `${path.join(": ")}: ${text}` : text);
      continue;
    }

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({ value: value[i], unwrapSingle, path });
      }
      continue;
    }

    const entries = Object.entries(value).filter(([, v]) => v != null);
    if (
      unwrapSingle &&
      entries.length === 1 &&
      typeof entries[0][1] === "string"
    ) {
      const text = entries[0][1];
      messages.push(path.length > 0 ? `${path.join(": ")}: ${text}` : text);
      continue;
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const [key, entryValue] = entries[i];
      const childPath = [...path, key];

      if (typeof entryValue === "string") {
        messages.push(`${childPath.join(": ")}: ${entryValue}`);
        continue;
      }

      stack.push({ value: entryValue, unwrapSingle, path: childPath });
    }
  }

  return messages;
}

function detailMessage(detail: unknown): string {
  return collectDetailMessages(detail, true).join("; ");
}

function flattenDetails(details: unknown): string[] {
  return collectDetailMessages(details, false);
}

function summarizeArrayValidation(
  data: ValidationErrorData,
  actualData: unknown[],
  details: unknown[],
): ValidationArraySummary {
  const groups = new Map<string, InvalidItemGroup>();
  let invalidCount = 0;

  for (let i = 0; i < actualData.length; i++) {
    const detail = details[i];
    if (!detail) continue;

    invalidCount++;
    const item = actualData[i];
    const message = detailMessage(detail);
    const key = `${JSON.stringify(item)}::${message}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    groups.set(key, { item, message, count: 1 });
  }

  const sorted = [...groups.values()].sort((a, b) => b.count - a.count);
  const shown = sorted.slice(0, MAX_INVALID_GROUPS);

  return {
    kind: "validation",
    expectedType: data.expectedType,
    invalidCount,
    totalCount: actualData.length,
    groups: shown,
    omittedGroupCount: sorted.length - shown.length,
  };
}

function summarizeFallbackValidation(
  data: ValidationErrorData,
): ValidationFallbackSummary {
  const counts = new Map<string, number>();
  for (const message of flattenDetails(data.details)) {
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const detailMessages = sorted
    .slice(0, MAX_DETAIL_TYPES)
    .map(([message, count]) =>
      count > 1 ? `${message} (×${count})` : message,
    );

  const omitted = sorted.length - detailMessages.length;
  if (omitted > 0) {
    detailMessages.push(`... and ${omitted} more error type(s)`);
  }

  return {
    kind: "validation",
    expectedType: data.expectedType,
    detailMessages,
    actual: data.actualData,
  };
}

export function summarizeValidation(
  data: ValidationErrorData,
): ValidationSummary {
  if (Array.isArray(data.actualData) && Array.isArray(data.details)) {
    return summarizeArrayValidation(data, data.actualData, data.details);
  }

  return summarizeFallbackValidation(data);
}

export function isValidationArraySummary(
  summary: ValidationSummary,
): summary is ValidationArraySummary {
  return "groups" in summary;
}

function inspect(value: unknown): string {
  return util.inspect(value, {
    depth: null,
    colors: false,
    breakLength: Infinity,
  });
}

function formatItem(value: unknown): string {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const inner = Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${JSON.stringify(entryValue)}`)
      .join(", ");
    return `{ ${inner} }`;
  }

  return inspect(value);
}

function formatExpectedType(expectedType: string): string {
  const match = /^Runtype<(.+)>$/s.exec(expectedType);
  return match?.[1] ?? expectedType;
}

function formatValidationSummaryHuman(summary: ValidationSummary): string {
  const lines = [
    "  Details:",
    "    Expected:",
    `      ${formatExpectedType(summary.expectedType)}`,
  ];

  if (isValidationArraySummary(summary)) {
    lines.push(
      "",
      "    Invalid items:",
      `      ${summary.invalidCount} / ${summary.totalCount}`,
    );

    if (summary.groups.length > 0) {
      const group = summary.groups[0];
      lines.push("", "    Most common violation:");
      lines.push(`      ${formatItem(group.item)} × ${group.count}`);
      lines.push(`      → ${group.message}`);

      const moreGroups = summary.groups.length - 1 + summary.omittedGroupCount;
      if (moreGroups > 0) {
        lines.push(`      (+ ${moreGroups} more violation type(s))`);
      }
    }

    return lines.join("\n");
  }

  if (summary.detailMessages.length > 0) {
    lines.push("", "    Messages:");
    for (const message of summary.detailMessages) {
      lines.push(`      ${message}`);
    }
  }

  lines.push("", "    Actual:", `      ${inspect(summary.actual)}`);
  return lines.join("\n");
}

export function formatValidationHuman(data: ValidationErrorData): string {
  return formatValidationSummaryHuman(summarizeValidation(data));
}
