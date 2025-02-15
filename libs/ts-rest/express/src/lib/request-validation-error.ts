import { ValidationError, ValidationErrorSchema } from '@ts-rest/core';
import { z } from 'zod';

export class RequestValidationError extends Error {
  constructor(
    public pathParams: ValidationError | null,
    public headers: ValidationError | null,
    public query: ValidationError | null,
    public body: ValidationError | null,
  ) {
    super('[ts-rest] request validation failed');
  }
}

export const DefaultRequestValidationErrorSchema = ValidationErrorSchema;

export const CombinedRequestValidationErrorSchema = z.object({
  pathParameterErrors: ValidationErrorSchema.nullable(),
  headerErrors: ValidationErrorSchema.nullable(),
  queryParameterErrors: ValidationErrorSchema.nullable(),
  bodyErrors: ValidationErrorSchema.nullable(),
});
