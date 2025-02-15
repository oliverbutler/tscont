import { StandardSchemaV1 } from './standard-schema';
import { z } from 'zod';

/*
  Should this be replaced with `SchemaError` from `@standard-schema/utils`?
*/
export class ValidationError
  extends Error
  implements StandardSchemaV1.FailureResult
{
  public readonly issues: readonly StandardSchemaV1.Issue[];

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    /*
      Internally the ZodError message property serializes the issues to json
      with a custom formatter that stringifies bigints. To keep the behavior
      as similar as possible we can replicate that here.
    */
    const message = JSON.stringify(
      issues,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );

    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }

  /*
    ZodError overrides the toString method to return the serialised message.
    The Next.js implementation relies on this behaviour.
  */
  override toString() {
    return this.message;
  }
}

/*
  Convert a ValidationError to a plain object because ValidationError extends
  Error and causes problems with NestJS.
*/
export const validationErrorResponse = (
  error: ValidationError,
): Pick<ValidationError, 'name' | 'issues'> => {
  return {
    name: error.name,
    issues: error.issues,
  };
};

export const ValidationErrorSchema = z.object({
  name: z.literal('ValidationError'),
  issues: z
    .array(
      z.object({
        message: z.string(),
        path: z
          .array(
            z.union([
              z.union([z.string(), z.number(), z.symbol()]),
              z
                .object({
                  key: z.union([z.string(), z.number(), z.symbol()]),
                })
                .readonly(),
            ]),
          )
          .readonly()
          .optional(),
      }),
    )
    .readonly(),
});
