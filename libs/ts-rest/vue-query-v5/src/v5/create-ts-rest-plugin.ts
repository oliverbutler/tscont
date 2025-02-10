import {
  QueryClient,
  VueQueryPlugin,
  VueQueryPluginOptions,
} from '@tanstack/vue-query';
import { inject, InjectionKey, Ref, ref, watch } from 'vue-demi';
import { initHooksContainer, initQueryClient } from './internal/create-hooks';
import type { AppRouter, ClientArgs } from '@ts-rest/core';

type ResolvedClientArgs<TClientArgs extends ClientArgs> = TClientArgs & {
  baseHeaders: TClientArgs['baseHeaders'] & ClientArgs['baseHeaders'];
} & ClientArgs;

export const createTsRestPlugin = <
  TContract extends AppRouter,
  TClientArgs extends ClientArgs,
>(
  contract: TContract,
  clientOptions: TClientArgs,
) => {
  const _clientOptions = ref(clientOptions) as Ref<TClientArgs>;

  /** TS-Rest client injection key. */
  const TS_REST_INJECTION_KEY = Symbol('ts-rest-client') as InjectionKey<
    ReturnType<typeof initHooksContainer<TContract, TClientArgs>>
  >;
  /** TS-Rest query client injection key. */
  const TS_REST_QUERY_CLIENT_INJECTION_KEY = Symbol(
    'ts-rest-query-client',
  ) as InjectionKey<ReturnType<typeof initQueryClient<TContract, TClientArgs>>>;

  /** Create a typed query client plugin. */
  const TsRestPlugin = {
    install(app: any, options?: VueQueryPluginOptions) {
      let queryClient: QueryClient;

      if (!options) {
        queryClient = new QueryClient();
      } else if ('queryClient' in options) {
        queryClient = options.queryClient ?? new QueryClient();
      } else if ('queryClientConfig' in options) {
        queryClient = new QueryClient(options.queryClientConfig);
      }

      watch(
        _clientOptions,
        (value) => {
          const _queryClient = initQueryClient(contract, value, queryClient);

          app
            .use(VueQueryPlugin, { ...options, queryClient: _queryClient })
            .provide(TS_REST_QUERY_CLIENT_INJECTION_KEY, _queryClient)
            .provide(
              TS_REST_INJECTION_KEY,
              initHooksContainer(contract, value),
            );
        },
        { immediate: true },
      );
    },
  };

  /** Inject the TS-Rest client. */
  const useClient = () => {
    const client = inject(TS_REST_INJECTION_KEY);

    if (!client) {
      throw new Error(
        'Client not initialized. Use TsRestPlugin to initialize one.',
      );
    }

    return client;
  };

  /** Inject the TS-Rest query client. */
  const useQueryClient = () => {
    const queryClient = inject(TS_REST_QUERY_CLIENT_INJECTION_KEY);

    if (!queryClient) {
      throw new Error(
        'QueryClient not initialized. Use TsRestPlugin to initialize one.',
      );
    }

    return queryClient;
  };

  /** Access and modify clobal client options. */
  const useClientOptions = () => {
    return _clientOptions as Ref<ResolvedClientArgs<TClientArgs>>;
  };

  return {
    TS_REST_INJECTION_KEY,
    TS_REST_QUERY_CLIENT_INJECTION_KEY,
    TsRestPlugin,
    useClient,
    useClientOptions,
    useQueryClient,
  };
};

export { initQueryClient, initHooksContainer as initClient };
