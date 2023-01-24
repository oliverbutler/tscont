import {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQueries,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  AppRoute,
  AppRouteFunction,
  AppRouteMutation,
  AppRouteQuery,
  AppRouter,
  AreAllPropertiesOptional,
  ClientArgs,
  fetchApi,
  getCompleteUrl,
  getRouteQuery,
  HTTPStatusCode,
  isAppRoute,
  OptionalIfAllOptional,
  PathParamsFromUrl,
  SuccessfulHttpStatusCode,
  Without,
  ZodInferOrType,
} from '@ts-rest/core';
import { z, ZodTypeAny } from 'zod';

type RecursiveProxyObj<T extends AppRouter> = {
  [TKey in keyof T]: T[TKey] extends AppRoute
    ? Without<UseQueryArgs<T[TKey]>, never>
    : T[TKey] extends AppRouter
    ? RecursiveProxyObj<T[TKey]>
    : never;
};

type AppRouteMutationType<T> = T extends ZodTypeAny ? z.input<T> : T;

type UseQueryArgs<TAppRoute extends AppRoute, TDataReturnArgs = DataReturnArgs<TAppRoute>> = {
  useQuery: TAppRoute extends AppRouteQuery
    ? DataReturnQuery<TAppRoute, TDataReturnArgs>
    : never;
  useInfiniteQuery: TAppRoute extends AppRouteQuery
    ? DataReturnInfiniteQuery<TAppRoute, TDataReturnArgs>
    : never;
  useQueries: TAppRoute extends AppRouteQuery
    ? DataReturnQueries<TAppRoute, TDataReturnArgs>
    : never;
  query: TAppRoute extends AppRouteQuery ? AppRouteFunction<TAppRoute> : never;
  useMutation: TAppRoute extends AppRouteMutation
    ? DataReturnMutation<TAppRoute, TDataReturnArgs>
    : never;
  mutation: TAppRoute extends AppRouteMutation
    ? AppRouteFunction<TAppRoute>
    : never;
};


type DataReturnArgsBase<TRoute extends AppRoute> = {
  body: TRoute extends AppRouteMutation
    ? AppRouteMutationType<TRoute['body']> extends null
      ? never
      : AppRouteMutationType<TRoute['body']>
    : never;
  params: PathParamsFromUrl<TRoute>;
  query: 'query' extends keyof TRoute
    ? AppRouteMutationType<TRoute['query']> extends null
      ? never
      : AppRouteMutationType<TRoute['query']>
    : never;
};

type DataReturnArgs<TRoute extends AppRoute> = OptionalIfAllOptional<
  DataReturnArgsBase<TRoute>
>;

/**
 * Split up the data and error to support react-query style
 * useQuery and useMutation error handling
 */
type SuccessResponseMapper<T> = {
  [K in keyof T]: K extends SuccessfulHttpStatusCode
    ? { status: K; body: ZodInferOrType<T[K]> }
    : never;
}[keyof T];

/**
 * Returns any handled errors, or any unhandled non success errors
 */
type ErrorResponseMapper<T> =
  | {
      [K in keyof T]: K extends SuccessfulHttpStatusCode
        ? never
        : { status: K; body: ZodInferOrType<T[K]> };
    }[keyof T]
  // If the response isn't one of our typed ones. Return "unknown"
  | {
      status: Exclude<HTTPStatusCode, keyof T | SuccessfulHttpStatusCode>;
      body: unknown;
    };

// Data response if it's a 2XX
type DataResponse<T extends AppRoute> = SuccessResponseMapper<T['responses']>;

// Error response if it's not a 2XX
type ErrorResponse<T extends AppRoute> = ErrorResponseMapper<T['responses']>;

// Used on X.useQuery
type DataReturnQuery<TAppRoute extends AppRoute, TDataReturnArgs> = AreAllPropertiesOptional<
  Without<TDataReturnArgs, never>
> extends true
  ? (
      queryKey: QueryKey,
      args?: Without<TDataReturnArgs, never>,
      options?: UseQueryOptions<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>
      >
    ) => UseQueryResult<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>>
  : (
      queryKey: QueryKey,
      args: Without<TDataReturnArgs, never>,
      options?: UseQueryOptions<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>
      >
    ) => UseQueryResult<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>>;


type DataReturnQueriesOptions<TAppRoute extends AppRoute, TDataReturnArgs> = Without<
  TDataReturnArgs,
  never
> &
  Omit<UseQueryOptions<TAppRoute['responses']>, 'queryFn'> & {
    queryKey: QueryKey;
  };

type DataReturnQueries<
  TAppRoute extends AppRoute,
  TDataReturnArgs,
  TQueries = readonly DataReturnQueriesOptions<TAppRoute, TDataReturnArgs>[],
> = (args: {
  queries: TQueries;
  context?: UseQueryOptions['context'];
}) => UseQueryResult<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>>[];

// Used on X.useInfiniteQuery
type DataReturnInfiniteQuery<TAppRoute extends AppRoute, TDataReturnArgs> =
  AreAllPropertiesOptional<
    Without<TDataReturnArgs, never>
  > extends true
    ? (
        queryKey: QueryKey,
        args?: (
          context: QueryFunctionContext<QueryKey>
        ) => Without<TDataReturnArgs, never>,
        options?: UseInfiniteQueryOptions<
          DataResponse<TAppRoute>,
          ErrorResponse<TAppRoute>
        >
      ) => UseInfiniteQueryResult<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>
      >
    : (
        queryKey: QueryKey,
        args: (
          context: QueryFunctionContext<QueryKey>
        ) => Without<TDataReturnArgs, never>,
        options?: UseInfiniteQueryOptions<
          DataResponse<TAppRoute>,
          ErrorResponse<TAppRoute>
        >
      ) => UseInfiniteQueryResult<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>
      >;

// Used pn X.useMutation
type DataReturnMutation<TAppRoute extends AppRoute, TDataReturnArgs > = (
  options?: UseMutationOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    Without<TDataReturnArgs, never>,
    unknown
  >
) => UseMutationResult<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  Without<TDataReturnArgs, never>,
  unknown
>;

const getRouteUseQuery = <TAppRoute extends AppRoute>(
  route: TAppRoute,
  clientArgs: ClientArgs
) => {
  return (
    queryKey: QueryKey,
    args?: DataReturnArgs<any>,
    options?: UseQueryOptions<TAppRoute['responses']>
  ) => {
    const dataFn: QueryFunction<TAppRoute['responses']> = async () => {
      const path = getCompleteUrl(
        args?.query,
        clientArgs.baseUrl,
        args?.params,
        route,
        !!clientArgs.jsonQuery
      );

      const result = await fetchApi(path, clientArgs, route, args?.body);

      // If the response is not a 2XX, throw an error to be handled by react-query
      if (!String(result.status).startsWith('2')) {
        throw result;
      }

      return result;
    };

    return useQuery(queryKey, dataFn, options);
  };
};

const getRouteUseQueries = <TAppRoute extends AppRoute, TDataReturnArgs>(
  route: TAppRoute,
  clientArgs: ClientArgs
) => {
  return (args: Parameters<DataReturnQueries<TAppRoute, TDataReturnArgs>>[0]) => {
    const queries = args.queries.map((query: any) => {
      const queryFn: QueryFunction<TAppRoute['responses']> = async () => {
        const path = getCompleteUrl(
          'query' in query ? query?.query : undefined,
          clientArgs.baseUrl,
          'params' in query ? query?.params : undefined,
          route,
          !!clientArgs.jsonQuery
        );

        const result = await fetchApi(
          path,
          clientArgs,
          route,
          'body' in query ? query?.body : undefined
        );

        // If the response is not a 2XX, throw an error to be handled by react-query
        if (!String(result.status).startsWith('2')) {
          throw result;
        }

        return result;
      };

      return {
        queryFn,
        ...query,
      };
    });

    return useQueries({ queries, context: args.context });
  };
};

const getRouteUseInfiniteQuery = <TAppRoute extends AppRoute>(
  route: TAppRoute,
  clientArgs: ClientArgs
) => {
  return (
    queryKey: QueryKey,
    args: (context: QueryFunctionContext) => DataReturnArgs<any>,
    options?: UseInfiniteQueryOptions<TAppRoute['responses']>
  ) => {
    const dataFn: QueryFunction<TAppRoute['responses']> = async (
      infiniteQueryParams
    ) => {
      const resultingQueryArgs = args(infiniteQueryParams);

      const path = getCompleteUrl(
        resultingQueryArgs.query,
        clientArgs.baseUrl,
        resultingQueryArgs.params,
        route,
        !!clientArgs.jsonQuery
      );

      const result = await fetchApi(
        path,
        clientArgs,
        route,
        resultingQueryArgs.body
      );

      // If the response is not a 2XX, throw an error to be handled by react-query
      if (!String(result.status).startsWith('2')) {
        throw result;
      }

      return result;
    };

    return useInfiniteQuery(queryKey, dataFn, options);
  };
};

const getRouteUseMutation = <TAppRoute extends AppRoute>(
  route: TAppRoute,
  clientArgs: ClientArgs
) => {
  return (options?: UseMutationOptions<TAppRoute['responses']>) => {
    const mutationFunction = async (args?: DataReturnArgs<any>) => {
      const path = getCompleteUrl(
        args?.query,
        clientArgs.baseUrl,
        args?.params,
        route,
        !!clientArgs.jsonQuery
      );

      const result = await fetchApi(path, clientArgs, route, args?.body);

      // If the response is not a 2XX, throw an error to be handled by react-query
      if (!String(result.status).startsWith('2')) {
        throw result;
      }

      return result;
    };

    return useMutation(
      mutationFunction as () => Promise<ZodInferOrType<TAppRoute['responses']>>,
      options
    );
  };
};

const createNewProxy = (router: AppRouter | AppRoute, args: ClientArgs) => {
  return new Proxy(
    {},
    {
      get: (_, propKey): unknown => {
        if (isAppRoute(router)) {
          switch (propKey) {
            case 'query':
              return getRouteQuery(router, args);
            case 'mutation':
              return getRouteQuery(router, args);
            case 'useQuery':
              return getRouteUseQuery(router, args);
            case 'useInfiniteQuery':
              return getRouteUseInfiniteQuery(router, args);
            case 'useQueries':
              return getRouteUseQueries(router, args);
            case 'useMutation':
              return getRouteUseMutation(router, args);
            default:
              throw new Error(`Unknown method called on ${String(propKey)}`);
          }
        } else {
          const subRouter = router[propKey as string];

          return createNewProxy(subRouter, args);
        }
      },
    }
  );
};

export type InitClientReturn<T extends AppRouter> = RecursiveProxyObj<T>;

export const initQueryClient = <T extends AppRouter>(
  router: T,
  args: ClientArgs
): InitClientReturn<T> => {
  const proxy = createNewProxy(router, args);

  return proxy as InitClientReturn<T>;
};
