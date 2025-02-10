import {
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
  useQueries,
  useQuery,
  QueryClient,
  useMutation,
  QueryOptions,
  skipToken,
} from '@tanstack/vue-query';
import {
  AppRoute,
  AppRouter,
  ClientArgs,
  evaluateFetchApiArgs,
  fetchApi,
  getRouteQuery,
  isAppRoute,
  isAppRouteQuery,
  isErrorResponse,
} from '@ts-rest/core';
import {
  MutationHooks,
  QueryHooks,
  TsRestVueQueryHooksContainer,
  TsRestInfiniteQueryOptions,
  TsRestQueryOptions,
  TsRestQueryClientFunctions,
  TsRestVueQueryClientFunctionsContainer,
  TsRestVueQueryClient,
  RequestData,
  DataResponse,
} from '../types';
import { unref } from 'vue-demi';
import type { MaybeRefDeep } from '@tanstack/vue-query/build/modern/types';
import { cloneDeepUnref } from './helper';

const apiFetcher = <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
  route: TAppRoute,
  clientArgs: TClientArgs,
  abortSignal?: AbortSignal,
) => {
  return async (requestData?: RequestData<TAppRoute, TClientArgs>) => {
    const fetchApiArgs = evaluateFetchApiArgs(
      route,
      clientArgs,
      requestData as any,
    );
    const result = await fetchApi({
      ...fetchApiArgs,
      fetchOptions: {
        ...(abortSignal && { signal: abortSignal }),
        ...fetchApiArgs.fetchOptions,
      },
    });

    // If the response is not a 2XX, throw an error to be handled by vue-query
    if (isErrorResponse(result)) {
      throw result;
    }

    return result as DataResponse<TAppRoute>;
  };
};

function createBaseQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TOptions extends QueryOptions<any, any>,
>(route: TAppRoute, clientArgs: TClientArgs, options: TOptions): TOptions {
  const { queryData: queryDataOrFunction, ...rqOptions } =
    options as unknown as TOptions &
      (
        | TsRestQueryOptions<TAppRoute, TClientArgs>
        | TsRestInfiniteQueryOptions<TAppRoute, TClientArgs>
      );

  const getQueryFn = () => {
    const _queryDataOrFunction = unref(queryDataOrFunction);

    if (_queryDataOrFunction === skipToken) {
      return skipToken;
    }

    if (typeof _queryDataOrFunction === 'function') {
      return (context?: QueryFunctionContext<QueryKey, unknown>) => {
        const requestData = (_queryDataOrFunction as Function)(context);
        return apiFetcher(route, clientArgs, context?.signal)(requestData);
      };
    }

    return (context?: QueryFunctionContext<QueryKey, unknown>) => {
      const requestData = cloneDeepUnref(
        _queryDataOrFunction as MaybeRefDeep<
          RequestData<TAppRoute, TClientArgs>
        >,
      );
      return apiFetcher(route, clientArgs, context?.signal)(requestData);
    };
  };

  return {
    ...rqOptions,
    queryFn: getQueryFn(),
  } as unknown as TOptions;
}

const appendTsRestResult = <T, TAppRoute extends AppRoute>(
  result: T,
  tsResult: {
    contractEndpoint: TAppRoute;
  },
) => ({
  ...result,
  ...tsResult,
});

const tanstackQueryHooks = {
  query: {
    useQuery,
    useInfiniteQuery,
  },
  queries: {
    useQueries,
  },
};

const wrapHooks = <
  T extends typeof tanstackQueryHooks.query | typeof tanstackQueryHooks.queries,
  H extends T extends typeof tanstackQueryHooks.query
    ? (options: QueryOptions<any, any>, queryClient?: QueryClient) => any
    : (
        options: { queries: QueryOptions<any, any>[] },
        queryClient?: QueryClient,
      ) => any,
>(
  hooks: T,
  getWrapper: (hook: H) => H,
) => {
  return Object.fromEntries(
    Object.entries(hooks).map(([hookName, hook]) => [
      hookName,
      getWrapper(hook),
    ]),
  ) as any;
};

const wrapAllHooks = <
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
>(
  appRoute: TAppRoute,
  clientOptions: TClientArgs,
) => {
  return {
    ...wrapHooks(tanstackQueryHooks.query, (hook) => (options, queryClient) => {
      return appendTsRestResult(
        hook(
          createBaseQueryOptions(appRoute, clientOptions, options),
          queryClient,
        ),
        {
          contractEndpoint: appRoute,
        },
      );
    }),
    ...wrapHooks(
      tanstackQueryHooks.queries,
      (hook) => (options, queryClient) => {
        return hook(
          {
            ...options,
            queries: options.queries.map((queryOptions) =>
              createBaseQueryOptions(
                appRoute,
                clientOptions,
                queryOptions as any,
              ),
            ),
          } as any,
          queryClient,
        );
      },
    ),
  };
};

export const initHooksContainer = <
  TContract extends AppRouter,
  TClientArgs extends ClientArgs,
>(
  contract: TContract,
  clientOptions: TClientArgs,
): TsRestVueQueryHooksContainer<TContract, TClientArgs> => {
  const recursiveInit = <TInner extends AppRouter>(
    innerRouter: TInner,
  ): TsRestVueQueryHooksContainer<TInner, TClientArgs> => {
    return Object.fromEntries(
      Object.entries(innerRouter).map(([key, subRouter]) => {
        if (isAppRoute(subRouter)) {
          if (isAppRouteQuery(subRouter)) {
            return [
              key,
              {
                query: getRouteQuery(subRouter, clientOptions) as any,
                ...wrapAllHooks(subRouter, clientOptions),
              } as QueryHooks<typeof subRouter, TClientArgs>,
            ];
          } else {
            return [
              key,
              {
                mutate: getRouteQuery(subRouter, clientOptions) as any,
                useMutation: (options) => {
                  return appendTsRestResult(
                    useMutation({
                      ...options,
                      mutationFn: apiFetcher(subRouter, clientOptions) as any,
                    }),
                    {
                      contractEndpoint: subRouter,
                    },
                  );
                },
              } as MutationHooks<typeof subRouter, TClientArgs>,
            ];
          }
        } else {
          return [key, recursiveInit(subRouter)];
        }
      }),
    );
  };

  return recursiveInit(contract);
};

export const initQueryClient = <
  TContract extends AppRouter,
  TClientArgs extends ClientArgs,
>(
  contract: TContract,
  clientOptions: TClientArgs,
  queryClient: QueryClient = new QueryClient(),
): TsRestVueQueryClient<TContract, TClientArgs> => {
  const recursiveInit = <TInner extends AppRouter>(
    innerRouter: TInner,
  ): TsRestVueQueryClientFunctionsContainer<TInner, TClientArgs> => {
    return Object.fromEntries(
      Object.entries(innerRouter).map(([key, subRouter]) => {
        if (isAppRoute(subRouter)) {
          if (isAppRouteQuery(subRouter)) {
            return [
              key,
              {
                getQueryData: (queryKey) => {
                  return queryClient.getQueryData(queryKey);
                },
                ensureQueryData: (options) => {
                  return queryClient.ensureQueryData(
                    createBaseQueryOptions(subRouter, clientOptions, options),
                  );
                },
                getQueriesData: (filters) => {
                  return queryClient.getQueriesData(filters);
                },
                setQueryData: (queryKey, updater, options) => {
                  return queryClient.setQueryData(queryKey, updater, options);
                },
                setQueriesData: (filters, updater, options) => {
                  return queryClient.setQueriesData(filters, updater, options);
                },
                getQueryState: (queryKey) => {
                  return queryClient.getQueryState(queryKey);
                },
                fetchQuery: (options) => {
                  return queryClient.fetchQuery(
                    createBaseQueryOptions(subRouter, clientOptions, options),
                  );
                },
                prefetchQuery: (options) => {
                  return queryClient.prefetchQuery(
                    createBaseQueryOptions(subRouter, clientOptions, options),
                  );
                },
                fetchInfiniteQuery: (options) => {
                  return queryClient.fetchInfiniteQuery(
                    createBaseQueryOptions(subRouter, clientOptions, options),
                  );
                },
                prefetchInfiniteQuery: (options) => {
                  return queryClient.prefetchInfiniteQuery(
                    createBaseQueryOptions(subRouter, clientOptions, options),
                  );
                },
              } as TsRestQueryClientFunctions<typeof subRouter, TClientArgs>,
            ];
          } else {
            return [key, undefined];
          }
        } else {
          return [key, recursiveInit(subRouter)];
        }
      }),
    );
  };

  return Object.assign(queryClient, recursiveInit(contract));
};
