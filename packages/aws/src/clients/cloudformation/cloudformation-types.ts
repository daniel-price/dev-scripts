import { StackSummary as internalStackSummary } from "@aws-sdk/client-cloudformation";
import { RequiredFields } from "@dev/util/src/types";

export type StackSummary = RequiredFields<
  internalStackSummary,
  "StackName" | "StackStatus"
>;
