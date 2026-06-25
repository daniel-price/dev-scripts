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

export type SourceErrorData = {
  kind: "source";
  source: string;
};

export type UnknownErrorData = {
  kind: "unknown";
  value: unknown;
};

export type AppErrorDetails =
  | ValidationErrorData
  | ExecuteErrorData
  | SourceErrorData
  | UnknownErrorData;

/** @deprecated Use AppErrorDetails */
export type RawErrorData = AppErrorDetails;

/** @deprecated Use AppErrorDetails */
export type ErrorData = AppErrorDetails;

/** @deprecated Use AppErrorDetails */
export type UserErrorData = AppErrorDetails;

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

export type NormalizedErrorData =
  | ValidationSummary
  | ExecuteErrorData
  | SourceErrorData
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
