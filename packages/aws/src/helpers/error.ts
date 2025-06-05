type T_SdkError = {
  Code: string;
};

export function isSdkError(error: unknown): error is T_SdkError {
  return error instanceof Error && Object.hasOwn(error, "Code");
}
