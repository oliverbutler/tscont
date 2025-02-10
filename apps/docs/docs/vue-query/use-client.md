# useClient

For a query or mutation use `useClient` from the exports of [`createTsRestPlugin`](/docs/vue-query/create-ts-rest-plugin).

This composable injects a typed ts-rest client. It uses the `TS_REST_QUERY_CLIENT_INJECTION_KEY` injection key under the hood.

```ts
import { useClient } from './tsr'

const tsr = useClient();

const { data, isPending } = tsr.posts.get.useQuery({ queryKey: ['posts'] });
const { mutate } = tsr.posts.create.useMutation();
```

See the official [`useQuery()`](https://tanstack.com/query/latest/docs/framework/vue/guides/queries) and [`useMutation()`](https://tanstack.com/query/latest/docs/framework/vue/guides/mutations) docs for more information.

## Reactive query

If you want to fetch a new resource, when your input parameters change, simply pass Refs to your `useQuery` options.

```ts
const id = ref('1');

const { data, isPending } = tsr.posts.get.useQuery({
  queryKey: ['posts', id],  // <- will fetch post with id '1'
  { params: { id} },
});

id.value = '2';  // <- will trigger a new request for post with id '2' and update the data
```
