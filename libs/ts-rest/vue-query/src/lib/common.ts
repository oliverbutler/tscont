import {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
} from '@tanstack/vue-query';
import {
  AppRoute,
  AppRouteMutation,
  ClientArgs,
  ClientInferRequest,
  ClientInferResponses,
  ErrorHttpStatusCode,
  SuccessfulHttpStatusCode,
  fetchApi,
  evaluateFetchApiArgs,
  isErrorResponse,
} from '@ts-rest/core';

// Data response if it's a 2XX
export type DataResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  SuccessfulHttpStatusCode,
  'force'
>;

// Error response if it's not a 2XX
export type ErrorResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  ErrorHttpStatusCode,
  'ignore'
>;

export const queryFn = <
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryKey extends QueryKey,
>(
  route: TAppRoute,
  clientArgs: TClientArgs,
  argsMapper?:
    | ClientInferRequest<AppRouteMutation, ClientArgs>
    | ((
        context: QueryFunctionContext<TQueryKey>,
      ) => ClientInferRequest<AppRouteMutation, ClientArgs>),
): QueryFunction<DataResponse<TAppRoute>, TQueryKey> => {
  return async (queryFnContext: QueryFunctionContext<TQueryKey>) => {
    const args =
      typeof argsMapper === 'function'
        ? argsMapper(queryFnContext)
        : argsMapper;

    const fetchApiArgs = evaluateFetchApiArgs(route, clientArgs, args);
    const result = await fetchApi({
      ...fetchApiArgs,
      fetchOptions: {
        ...(queryFnContext?.signal && { signal: queryFnContext.signal }),
        ...fetchApiArgs.fetchOptions,
      },
    });

    // If the response is not a 2XX, throw an error to be handled by react-query
    if (isErrorResponse(result)) {
      throw result;
    }

    return result as DataResponse<TAppRoute>;
  };
};
