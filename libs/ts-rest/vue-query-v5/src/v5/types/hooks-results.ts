import { AppRoute, ClientArgs } from '@ts-rest/core';
import {
  InfiniteData,
  UseQueryReturnType as TanStackUseQueryResult,
  UseInfiniteQueryReturnType as TanStackUseInfiniteQueryResult,
  UseMutationReturnType as TanStackUseMutationResult,
  UseQueryDefinedReturnType as TanstackDefinedUseQueryResult,
} from '@tanstack/vue-query';
import { QueriesResults } from '../internal/queries-options';
import { DataResponse, ErrorResponse, RequestData } from './common';

export type TsRestResult<TAppRoute extends AppRoute> = {
  contractEndpoint: TAppRoute;
};

export type UseQueryResult<
  TAppRoute extends AppRoute,
  TData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
> = TanStackUseQueryResult<TData, TError> & TsRestResult<TAppRoute>;

export type DefinedUseQueryResult<
  TAppRoute extends AppRoute,
  TData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
> = TanstackDefinedUseQueryResult<TData, TError> & TsRestResult<TAppRoute>;

export type UseQueriesResult<
  TAppRoute extends AppRoute,
  TQueries extends Array<any>,
> = QueriesResults<TAppRoute, TQueries>;

export type UseInfiniteQueryResult<
  TAppRoute extends AppRoute,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TError = ErrorResponse<TAppRoute>,
> = TanStackUseInfiniteQueryResult<TData, TError> & TsRestResult<TAppRoute>;

export type UseMutationResult<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
  TVariables = RequestData<TAppRoute, TClientArgs>,
  TContext = unknown,
> = TanStackUseMutationResult<TData, TError, TVariables, TContext> &
  TsRestResult<TAppRoute>;
