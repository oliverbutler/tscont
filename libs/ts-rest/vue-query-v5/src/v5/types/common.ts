import {
  AppRoute,
  AppRouteMutation,
  AppRouteQuery,
  AppRouter,
  ClientArgs,
  ClientInferResponses,
  ErrorHttpStatusCode,
  PartialClientInferRequest,
  SuccessfulHttpStatusCode,
} from '@ts-rest/core';
import { QueryClient } from '@tanstack/vue-query';
import { MutationHooks, QueryHooks } from './hooks';
import { TsRestQueryClientFunctions } from './query-client-functions';

export type DataResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  SuccessfulHttpStatusCode,
  'force'
>;

export type ErrorResponse<TAppRoute extends AppRoute> =
  | ClientInferResponses<TAppRoute, ErrorHttpStatusCode, 'ignore'>
  | Error;

// TODO: in v4 remove Omit after `cache` and `next` are removed. they are removed here because this is a new library
export type RequestData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = Omit<PartialClientInferRequest<TAppRoute, TClientArgs>, 'cache' | 'next'>;

export type TsRestVueQueryHooksContainer<
  T extends AppRouter,
  TClientArgs extends ClientArgs,
> = {
  [TKey in keyof T]: T[TKey] extends AppRoute
    ? T[TKey] extends AppRouteQuery
      ? QueryHooks<T[TKey], TClientArgs>
      : T[TKey] extends AppRouteMutation
      ? MutationHooks<T[TKey], TClientArgs>
      : never
    : T[TKey] extends AppRouter
    ? TsRestVueQueryHooksContainer<T[TKey], TClientArgs>
    : never;
};

export type TsRestVueQueryClientFunctionsContainer<
  T extends AppRouter,
  TClientArgs extends ClientArgs,
> = {
  [TKey in keyof T]: T[TKey] extends AppRoute
    ? T[TKey] extends AppRouteQuery
      ? TsRestQueryClientFunctions<T[TKey], TClientArgs>
      : never
    : T[TKey] extends AppRouter
    ? TsRestVueQueryClientFunctionsContainer<T[TKey], TClientArgs>
    : never;
};

export type TsRestVueQueryClient<
  T extends AppRouter,
  TClientArgs extends ClientArgs,
> = QueryClient & TsRestVueQueryClientFunctionsContainer<T, TClientArgs>;

export type ClientOptions = ClientArgs;

export type InferClientArgs<
  TClient extends TsRestVueQueryHooksContainer<any, any>,
> = TClient extends TsRestVueQueryHooksContainer<any, infer TClientArgs>
  ? TClientArgs
  : never;
