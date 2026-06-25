import { DynamoDBServiceException } from "@aws-sdk/client-dynamodb";

type T_SdkError = {
  Code: string;
};

export function isSdkError(error: unknown): error is T_SdkError {
  return error instanceof Error && Object.hasOwn(error, "Code");
}

export function isDynamoValidationException(
  error: unknown,
): error is DynamoDBServiceException {
  return (
    error instanceof DynamoDBServiceException &&
    error.name === "ValidationException"
  );
}
