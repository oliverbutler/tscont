import {
  useQuery,
  QueryKey,
  UseQueryReturnType,
  UseQueryOptions,
  QueryFunctionContext,
} from '@tanstack/vue-query';
import {
  AppRoute,
  AppRouteMutation,
  AreAllPropertiesOptional,
  ClientArgs,
  ClientInferRequest,
  PartialClientInferRequest,
} from '@ts-rest/core';
import { DataResponse, ErrorResponse, queryFn } from './common';

// Used on X.useQuery
export type DataReturnQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TArgs = PartialClientInferRequest<TAppRoute, TClientArgs>,
> = AreAllPropertiesOptional<TArgs> extends true
  ? <TData = DataResponse<TAppRoute>, TQueryKey extends QueryKey = QueryKey>(
      queryKey: TQueryKey,
      args?: (context: QueryFunctionContext<TQueryKey>) => TArgs,
      options?: UseQueryOptions<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>,
        TData,
        TQueryKey
      >,
    ) => UseQueryReturnType<TData, ErrorResponse<TAppRoute>>
  : <TData = DataResponse<TAppRoute>, TQueryKey extends QueryKey = QueryKey>(
      queryKey: TQueryKey,
      args: (context: QueryFunctionContext<TQueryKey>) => TArgs,
      options?: UseQueryOptions<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>,
        TData,
        TQueryKey
      >,
    ) => UseQueryReturnType<TData, ErrorResponse<TAppRoute>>;

export const getRouteUseQuery = <
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
>(
  route: TAppRoute,
  clientArgs: TClientArgs,
) => {
  return (
    queryKey: QueryKey,
    args?: (
      context: QueryFunctionContext<QueryKey>,
    ) => ClientInferRequest<AppRouteMutation, ClientArgs>,
    options?: UseQueryOptions<DataResponse<TAppRoute>>,
  ) => {
    const dataFn = queryFn(route, clientArgs, args);

    return useQuery({ queryKey, queryFn: dataFn, ...options });
  };
};
