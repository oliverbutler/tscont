import { AppRoute, AppRouter, AppRouteResponse } from './dsl';
import { ResolveResponseType, ServerInferResponses } from './infer-types';
import { HTTPStatusCode } from './status-codes';
import { CommonAndEqual, SchemaInputOrType } from './type-utils';

export class TsRestResponseError<T extends AppRoute | AppRouter> extends Error {
  public statusCode: HTTPStatusCode;
  public body: any;

  constructor(
    route: T,
    response: T extends AppRouter
      ? ServerCommonResponses<T>
      : ServerInferResponses<T>,
  ) {
    super();

    this.statusCode = response.status as HTTPStatusCode;
    this.body = response.body;
    this.name = this.constructor.name;

    if (typeof response.body === 'string') {
      this.message = response.body;
    } else if (
      typeof response.body === 'object' &&
      response.body !== null &&
      'message' in response.body &&
      typeof response.body.message === 'string'
    ) {
      this.message = response.body['message'];
    } else {
      this.message = 'Error';
    }
  }
}

type FlattenAppRouter<T extends AppRouter | AppRoute> = T extends AppRoute
  ? T
  : {
      [TKey in keyof T]: T[TKey] extends AppRoute
        ? T[TKey]
        : T[TKey] extends AppRouter
        ? FlattenAppRouter<T[TKey]>
        : never;
    }[keyof T];

type AppRouterCommonResponses<T extends AppRouter> = CommonAndEqual<
  FlattenAppRouter<T>['responses']
>;

type ServerCommonResponses<
  T extends AppRouter,
  TResponses = AppRouterCommonResponses<T>,
> = {
  [K in keyof TResponses]: {
    status: K;
    body: TResponses[K] extends AppRouteResponse
      ? SchemaInputOrType<ResolveResponseType<TResponses[K]>>
      : never;
  };
}[keyof TResponses];
