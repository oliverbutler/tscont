import { AppRoute, ClientArgs } from '@ts-rest/core';
import {
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  InfiniteData,
  QueryFilters,
  QueryKey,
  QueryState,
  SetDataOptions,
} from '@tanstack/vue-query';
import { DataResponse, ErrorResponse } from './common';
import { TsRestQueryOptions } from './hooks-options';

type Updater<TInput, TOutput> = TOutput | ((input: TInput) => TOutput);

export interface TsRestQueryClientFunctions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryFnData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
  TQueryKey extends QueryKey = QueryKey,
> {
  getQueryData(queryKey: TQueryKey): TQueryFnData | undefined;

  ensureQueryData<TData = TQueryFnData>(
    options: EnsureQueryDataOptions<TQueryFnData, TError, TData> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<TData>;

  getQueriesData(
    filters: QueryFilters,
  ): Array<[TQueryKey, TQueryFnData | undefined]>;

  setQueryData(
    queryKey: TQueryKey,
    updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
    options?: SetDataOptions,
  ): TQueryFnData | undefined;

  setQueriesData(
    filters: QueryFilters,
    updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
    options?: SetDataOptions,
  ): Array<[TQueryKey, TQueryFnData | undefined]>;

  getQueryState(
    queryKey: TQueryKey,
  ): QueryState<TQueryFnData, TError> | undefined;

  fetchQuery<TData = TQueryFnData>(
    options: FetchQueryOptions<TQueryFnData, TError, TData> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<TData>;

  prefetchQuery<TData = TQueryFnData>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, QueryKey> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<void>;

  fetchInfiniteQuery<TData = TQueryFnData, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    > &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<InfiniteData<TData, TPageParam>>;

  prefetchInfiniteQuery<TData = TQueryFnData, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      QueryKey,
      TPageParam
    > &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<void>;
}
