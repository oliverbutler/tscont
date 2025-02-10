import type {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  UseInfiniteQueryOptions as TanStackUseInfiniteQueryOptions,
  UseMutationOptions as TanStackUseMutationOptions,
  UseQueryOptions as TanStackUseQueryOptions,
  SkipToken,
} from '@tanstack/vue-query';
import type {
  AppRoute,
  ClientArgs,
  IfAllPropertiesOptional,
} from '@ts-rest/core';
import type {
  QueriesOptions,
  QueriesResults,
} from '../internal/queries-options';
import type { DataResponse, ErrorResponse, RequestData } from './common';
import type { MaybeRefDeepOrGetter } from './helper';
import type { DistributiveOmit } from '@tanstack/vue-query/build/modern/types';
import { Ref } from 'vue-demi';

export type TsRestQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryData = RequestData<TAppRoute, TClientArgs>,
> = IfAllPropertiesOptional<
  TQueryData,
  { queryData?: MaybeRefDeepOrGetter<TQueryData | SkipToken> },
  { queryData: MaybeRefDeepOrGetter<TQueryData | SkipToken> }
>;

export type TsRestInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = {
  queryData:
    | ((
        context: QueryFunctionContext<TQueryKey, TPageParam>,
      ) => RequestData<TAppRoute, TClientArgs>)
    | SkipToken;
};

export type UseQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData,
  TQueryData,
  TQueryKey extends QueryKey = QueryKey,
> = DistributiveOmit<
  TanStackUseQueryOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    TData,
    TQueryData,
    TQueryKey
  >,
  'queryFn'
> &
  TsRestQueryOptions<TAppRoute, TClientArgs>;

export type UseQueryOptionsWithInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
  TQueryData = DataResponse<TAppRoute>,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TAppRoute, TClientArgs, TData, TQueryData, TQueryKey> & {
  initialData: DataResponse<TAppRoute> | (() => DataResponse<TAppRoute>);
};

export type UseQueryOptionsWithoutInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
  TQueryData = DataResponse<TAppRoute>,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TAppRoute, TClientArgs, TData, TQueryData, TQueryKey> & {
  initialData?: undefined;
};

type UnrefObserverResult<T> = T extends Readonly<Ref<infer R>> ? R : never;

export type UseQueriesOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  T extends Array<any>,
  TCombinedResult = UnrefObserverResult<QueriesResults<TAppRoute, T>>,
> = {
  queries: readonly [...QueriesOptions<TAppRoute, TClientArgs, T>];
  combine?: (
    result: UnrefObserverResult<QueriesResults<TAppRoute, T>>,
  ) => TCombinedResult;
};

export type UseInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = DistributiveOmit<
  TanStackUseInfiniteQueryOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    TData,
    DataResponse<TAppRoute>,
    TQueryKey,
    TPageParam
  >,
  'queryFn'
> &
  TsRestInfiniteQueryOptions<TAppRoute, TClientArgs, TQueryKey, TPageParam>;

export type UseInfiniteQueryOptionsWithInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = UseInfiniteQueryOptions<
  TAppRoute,
  TClientArgs,
  TData,
  TQueryKey,
  TPageParam
> & {
  initialData:
    | InfiniteData<DataResponse<TAppRoute>, TPageParam>
    | (() => InfiniteData<DataResponse<TAppRoute>, TPageParam>);
};

export type UseInfiniteQueryOptionsWithoutInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = UseInfiniteQueryOptions<
  TAppRoute,
  TClientArgs,
  TData,
  TQueryKey,
  TPageParam
> & {
  initialData?: undefined;
};

export type UseMutationOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TContext = unknown,
> = TanStackUseMutationOptions<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  RequestData<TAppRoute, TClientArgs>,
  TContext
>;
