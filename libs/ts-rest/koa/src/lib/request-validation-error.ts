import { ZodErrorSchema } from '@ts-rest/core';
import { z } from 'zod';

export class RequestValidationError extends Error {
  constructor(
    public pathParams: z.ZodError | null,
    public headers: z.ZodError | null,
    public query: z.ZodError | null,
    public body: z.ZodError | null,
  ) {
    super('[ts-rest] request validation failed');
  }
}

export const CombinedRequestValidationErrorSchema = z.object({
  pathParameterErrors: ZodErrorSchema.nullable(),
  headerErrors: ZodErrorSchema.nullable(),
  queryParameterErrors: ZodErrorSchema.nullable(),
  bodyErrors: ZodErrorSchema.nullable(),
});
