export type ValidationErrorData = {
  kind: "validation";
  expectedType: string;
  actualData: unknown;
  details?: unknown;
};

export type ExecuteErrorData = {
  kind: "execute";
  stderr: string;
};

export type UnknownErrorData = {
  kind: "unknown";
  value: unknown;
};

export type AppErrorDetails =
  | ValidationErrorData
  | ExecuteErrorData
  | UnknownErrorData;

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

export type SourceLogData = {
  kind: "source";
  source: string;
};

export type NormalizedErrorData =
  | ValidationSummary
  | ExecuteErrorData
  | SourceLogData
  | UnknownErrorData;

export type LoggedError = {
  context?: string;
  message: string;
  name: string;
  data?: NormalizedErrorData;
  humanReadableDetails?: string;
  humanReadableDetailsBlock?: boolean;
  stack?: string[];
  cause?: LoggedError;
};

export interface ErrorFormatter {
  format(error: LoggedError): string;
}
