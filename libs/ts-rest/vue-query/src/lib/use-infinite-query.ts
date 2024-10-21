import { useInfiniteQuery } from '@tanstack/vue-query';
import type {
  QueryFunctionContext,
  QueryKey,
  UseInfiniteQueryOptions,
  UseInfiniteQueryReturnType,
} from '@tanstack/vue-query';
import {
  AppRoute,
  AppRouteMutation,
  ClientArgs,
  ClientInferRequest,
  PartialClientInferRequest,
} from '@ts-rest/core';
import { DataResponse, ErrorResponse, queryFn } from './common';

// Used on X.useInfiniteQuery
export type DataReturnInfiniteQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = <TData = DataResponse<TAppRoute>, TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  args: (
    context: QueryFunctionContext<TQueryKey>,
  ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
  options?: UseInfiniteQueryOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    TData,
    TQueryKey
  >,
) => UseInfiniteQueryReturnType<TData, ErrorResponse<TAppRoute>>;

export const getRouteUseInfiniteQuery =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  (
    queryKey: QueryKey,
    argsMapper: (
      context: QueryFunctionContext,
    ) => ClientInferRequest<AppRouteMutation, ClientArgs>,
    options?: UseInfiniteQueryOptions<DataResponse<TAppRoute>>,
  ) => {
    const dataFn = queryFn(route, clientArgs, argsMapper);

    return useInfiniteQuery({
      queryKey,
      queryFn: dataFn,
      ...options,
    });
  };
