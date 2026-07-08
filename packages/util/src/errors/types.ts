export type ValidationErrorData = {
  kind: "validation";
  expectedType: string;
  actualData: unknown;
  details?: unknown;
};

export type InvalidItemGroup = {
  item: unknown;
  count: number;
  message: string;
};

export type ValidationArraySummary = {
  kind: "validation";
  expectedType: string;
  invalidCount: number;
  totalCount: number;
  groups: InvalidItemGroup[];
  omittedGroupCount: number;
};

export type ValidationFallbackSummary = {
  kind: "validation";
  expectedType: string;
  detailMessages: string[];
  actual: unknown;
};

export type ValidationSummary =
  | ValidationArraySummary
  | ValidationFallbackSummary;

export type LoggedError = {
  context?: string;
  message: string;
  name: string;
  validation?: ValidationSummary;
  source?: string;
  stderr?: string;
  unknownValue?: unknown;
  humanReadableDetails?: string;
  humanReadableDetailsBlock?: boolean;
  stack?: string[];
  cause?: LoggedError;
};

export interface ErrorFormatter {
  format(error: LoggedError): string;
}
