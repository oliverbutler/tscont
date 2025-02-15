import { AppRoute } from './dsl';
import { ValidationError } from './validation-error';

export class ResponseValidationError extends Error {
  constructor(
    public appRoute: AppRoute,
    public cause: ValidationError,
  ) {
    super(
      `[ts-rest] Response validation failed for ${appRoute.method} ${appRoute.path}: ${cause.message}`,
    );
  }
}
