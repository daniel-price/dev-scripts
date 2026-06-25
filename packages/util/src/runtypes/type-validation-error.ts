import util from "util";

import { AppError } from "../errors/app-error";
import type { ValidationErrorData, ValidationSummary } from "../errors/types";
import {
  isValidationArraySummary,
  summarizeValidation,
} from "../errors/validation";

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

function formatHumanReadableDetails(validation: ValidationErrorData): string {
  return formatValidationSummaryHuman(summarizeValidation(validation));
}

export class TypeValidationError extends AppError {
  readonly validation: ValidationErrorData;
  override readonly humanReadableDetails: string;
  override readonly humanReadableDetailsBlock = true;

  constructor(validation: ValidationErrorData) {
    const humanReadableDetails = formatHumanReadableDetails(validation);

    super("Data does not match expected type", {
      details: validation,
      humanReadableDetails,
      humanReadableDetailsBlock: true,
    });

    this.name = "TypeValidationError";
    this.validation = validation;
    this.humanReadableDetails = humanReadableDetails;
  }
}
