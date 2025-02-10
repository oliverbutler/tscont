# createTsRestPlugin

This factory creates the necessary wrappers for `@tanstack/vue-query` with ts-rest type information.

It creates the following for you:

1. `TsRestPlugin` - a Vue plugin that provides typed ts-rest client and enriched `QueryClient` in Vue app context
2. `useClient` - a composable to inject the typed ts-rest client
3. `useQueryClient` - a composable to inject the typed QueryClient
4. `useClientOptions` - a composable to inject the typed client-options for the ts-rest client
5. Injection keys used by `useClient` and `useQueryClient`

:::info

`VueQueryPlugin` from `@tanstack/vue-query` is installed into your app by the Plugin.

:::

## Usage

Export the factory results from a sepertate file, then import anywhere in your Vue app.

```ts
export const isLoadingGlobal = ref(false);

export const {
  TsRestPlugin,
  useClient,
  useQueryClient,
  useClientOptions,
  TS_REST_INJECTION_KEY,
  TS_REST_QUERY_CLIENT_INJECTION_KEY,
} = createTsRestPlugin(
  apiBlog,
  {
    baseUrl: 'http://localhost:3334',
    baseHeaders: {
      'x-api-key': 'key',
    },
  },
);
```

Add the `TsRestPlugin` to your Vue app. All `VueQueryPlugin` options are supported.

:::note

This example demonstrates how to add a global loading indicator with a custom `QueryClient`.
`@tanstack/vue-query` already provides a [composable](https://tanstack.com/query/latest/docs/framework/vue/guides/background-fetching-indicators#displaying-global-background-fetching-loading-state) for this specific purpose.

:::


```ts
const IS_GLOBAL_LOADING = Symbol('IS_GLOBAL_LOADING') as InjectionKey<Ref<boolean>>;

createApp(App)
  .use({
    install(app) {
      app.provide(IS_GLOBAL_LOADING, ref(false));
    },
  })
  .use(TsRestPlugin, {
    queryClient: new QueryClient({  // <- optional
      defaultOptions: {
        mutations: {
          onMutate: () => (inject(IS_GLOBAL_LOADING)!.value = true),
          onSettled: () => (inject(IS_GLOBAL_LOADING)!.value = false),
        },
      },
    }),
  })
  .mount('#app');
```
