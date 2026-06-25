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

function detailMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (typeof detail === "object" && detail !== null) {
    const entries = Object.entries(detail).filter(
      ([, value]) => value !== null && value !== undefined,
    );
    if (entries.length === 1 && typeof entries[0][1] === "string") {
      return entries[0][1];
    }

    return entries
      .flatMap(([key, value]) => {
        if (typeof value === "string") return [`${key}: ${value}`];
        return detailMessage(value)
          .split("; ")
          .map((message) => `${key}: ${message}`);
      })
      .join("; ");
  }

  return String(detail);
}

function flattenDetails(details: unknown): string[] {
  if (details === null || details === undefined) return [];

  if (Array.isArray(details)) {
    return details.flatMap((detail) => flattenDetails(detail));
  }

  if (typeof details === "string") return [details];

  if (typeof details === "object") {
    return Object.entries(details).flatMap(([key, value]) => {
      if (value === null || value === undefined) return [];
      if (typeof value === "string") return [`${key}: ${value}`];
      return flattenDetails(value).map((message) => `${key}: ${message}`);
    });
  }

  return [String(details)];
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
