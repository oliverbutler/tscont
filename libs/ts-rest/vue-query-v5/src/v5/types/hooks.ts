import { AppRoute, AppRouteFunction, ClientArgs } from '@ts-rest/core';
import { InfiniteData, QueryKey, QueryClient } from '@tanstack/vue-query';
import {
  UseInfiniteQueryOptions,
  UseInfiniteQueryOptionsWithInitialData,
  UseInfiniteQueryOptionsWithoutInitialData,
  UseMutationOptions,
  UseQueriesOptions,
  UseQueryOptions,
  UseQueryOptionsWithInitialData,
  UseQueryOptionsWithoutInitialData,
} from './hooks-options';
import { DataResponse, ErrorResponse, RequestData } from './common';
import {
  DefinedUseQueryResult,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueriesResult,
  UseQueryResult,
} from './hooks-results';

export interface QueryHooks<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryFnData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
> {
  query: AppRouteFunction<TAppRoute, TClientArgs>;

  useQuery<
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: UseQueryOptionsWithInitialData<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryData,
      TQueryKey
    >,
    queryClient?: QueryClient,
  ): DefinedUseQueryResult<TAppRoute, TData, TError>;

  useQuery<
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: UseQueryOptionsWithoutInitialData<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryData,
      TQueryKey
    >,
    queryClient?: QueryClient,
  ): UseQueryResult<TAppRoute, TData, TError>;

  useQuery<
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: UseQueryOptions<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryData,
      TQueryKey
    >,
    queryClient?: QueryClient,
  ): UseQueryResult<TAppRoute, TData, TError>;

  useQueries<
    T extends Array<any>,
    TCombinedResult = UseQueriesResult<TAppRoute, T>,
  >(
    options: UseQueriesOptions<TAppRoute, TClientArgs, T, TCombinedResult>,
    queryClient?: QueryClient,
  ): TCombinedResult;

  useInfiniteQuery<
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: UseInfiniteQueryOptionsWithInitialData<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryKey,
      TPageParam
    >,
    queryClient?: QueryClient,
  ): UseInfiniteQueryResult<TAppRoute, TData, TError>;

  useInfiniteQuery<
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: UseInfiniteQueryOptionsWithoutInitialData<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryKey,
      TPageParam
    >,
    queryClient?: QueryClient,
  ): UseInfiniteQueryResult<TAppRoute, TData, TError>;

  useInfiniteQuery<
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: UseInfiniteQueryOptions<
      TAppRoute,
      TClientArgs,
      TData,
      TQueryKey,
      TPageParam
    >,
    queryClient?: QueryClient,
  ): UseInfiniteQueryResult<TAppRoute, TData, TError>;
}

export interface MutationHooks<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
  TVariables = RequestData<TAppRoute, TClientArgs>,
> {
  mutate: AppRouteFunction<TAppRoute, TClientArgs>;

  useMutation<TContext = unknown>(
    options?: UseMutationOptions<TAppRoute, TClientArgs, TContext>,
    queryClient?: QueryClient,
  ): UseMutationResult<
    TAppRoute,
    TClientArgs,
    TData,
    TError,
    TVariables,
    TContext
  >;
}
