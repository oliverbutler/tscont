import type { QueriesPlaceholderDataFunction } from '@tanstack/query-core';
import {
  QueryKey,
  QueryObserverResult,
  UseQueryDefinedReturnType,
  UseQueryReturnType,
} from '@tanstack/vue-query';
import { AppRoute, ClientArgs } from '@ts-rest/core';
import { UseQueryOptions } from '../types/hooks-options';
import { DataResponse, ErrorResponse } from '../types/common';
import { DistributiveOmit } from '@tanstack/vue-query/build/modern/types';
import { Ref } from 'vue-demi';

type UseQueryOptionsForUseQueries<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
  TQueryData = DataResponse<TAppRoute>,
  TQueryKey extends QueryKey = QueryKey,
> = DistributiveOmit<
  UseQueryOptions<TAppRoute, TClientArgs, TData, TQueryData, TQueryKey>,
  'placeholderData'
> & {
  placeholderData?:
    | DataResponse<TAppRoute>
    | QueriesPlaceholderDataFunction<DataResponse<TAppRoute>>;
};

type GetUseQueryOptionsForUseQueries<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  T,
> = T extends {
  select?: (data: any) => infer TData;
}
  ? UseQueryOptionsForUseQueries<TAppRoute, TClientArgs, TData>
  : UseQueryOptionsForUseQueries<TAppRoute, TClientArgs>;

type GetUseQueryResult<TAppRoute extends AppRoute, T> = T extends {
  select?: (data: any) => infer TData;
}
  ? GetDefinedOrUndefinedQueryResult<
      T,
      unknown extends TData ? DataResponse<TAppRoute> : TData,
      ErrorResponse<TAppRoute>
    >
  : QueryObserverResult<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>>;

type MAXIMUM_DEPTH = 20;

export type QueriesOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  T extends Array<any>,
  TResults extends Array<any> = [],
  TDepth extends ReadonlyArray<number> = [],
> = TDepth['length'] extends MAXIMUM_DEPTH
  ? Array<UseQueryOptionsForUseQueries<TAppRoute, TClientArgs>>
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...TResults, GetUseQueryOptionsForUseQueries<TAppRoute, TClientArgs, Head>]
  : T extends [infer Head, ...infer Tails]
  ? QueriesOptions<
      TAppRoute,
      TClientArgs,
      [...Tails],
      [
        ...TResults,
        GetUseQueryOptionsForUseQueries<TAppRoute, TClientArgs, Head>,
      ],
      [...TDepth, 1]
    >
  : ReadonlyArray<unknown> extends T
  ? T
  : T extends Array<
      UseQueryOptionsForUseQueries<TAppRoute, TClientArgs, infer TData>
    >
  ? Array<UseQueryOptionsForUseQueries<TAppRoute, TClientArgs, TData>>
  : Array<UseQueryOptionsForUseQueries<TAppRoute, TClientArgs>>;

export type QueriesResults<
  TAppRoute extends AppRoute,
  T extends Array<any>,
  TResults extends Array<any> = [],
  TDepth extends ReadonlyArray<number> = [],
> = TDepth['length'] extends MAXIMUM_DEPTH
  ? Readonly<Ref<Array<UseQueryReturnType<unknown, Error>>>>
  : T extends []
  ? Readonly<Ref<[]>>
  : T extends [infer Head]
  ? Readonly<Ref<[...TResults, GetUseQueryResult<TAppRoute, Head>]>>
  : T extends [infer Head, ...infer Tails]
  ? QueriesResults<
      TAppRoute,
      [...Tails],
      [...TResults, GetUseQueryResult<TAppRoute, Head>],
      [...TDepth, 1]
    >
  : T extends Array<
      UseQueryOptionsForUseQueries<TAppRoute, ClientArgs, infer TData>
    >
  ? Readonly<
      Ref<
        Array<
          QueryObserverResult<
            unknown extends TData ? DataResponse<TAppRoute> : TData,
            ErrorResponse<TAppRoute>
          >
        >
      >
    >
  : Readonly<Ref<Array<QueryObserverResult<unknown, Error>>>>;

type GetDefinedOrUndefinedQueryResult<T, TData, TError> = T extends {
  initialData?: infer TInitialData;
}
  ? unknown extends TInitialData
    ? QueryObserverResult<TData, TError>
    : TInitialData extends TData
    ? UseQueryDefinedReturnType<TData, TError>
    : TInitialData extends () => infer TInitialDataResult
    ? unknown extends TInitialDataResult
      ? QueryObserverResult<TData, TError>
      : TInitialDataResult extends TData
      ? UseQueryDefinedReturnType<TData, TError>
      : QueryObserverResult<TData, TError>
    : QueryObserverResult<TData, TError>
  : QueryObserverResult<TData, TError>;
