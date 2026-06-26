import { AppError } from "../errors/app-error";
import type { ValidationErrorData } from "../errors/types";
import { formatValidationHuman } from "../errors/validation";

export class TypeValidationError extends AppError {
  readonly validation: ValidationErrorData;
  override readonly humanReadableDetails: string;
  override readonly humanReadableDetailsBlock = true;

  constructor(validation: ValidationErrorData) {
    const humanReadableDetails = formatValidationHuman(validation);

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
