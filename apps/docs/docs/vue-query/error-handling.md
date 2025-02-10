# Error Handling

If a request fails, the `error` property will be set to the response from the server, or the thrown error by `fetch`. This is the same as the `data` property for successful requests.

The type of the `error` property on the Vue Query composables will be set as `{ status: ...; body: ...; headers: ... } | Error`, where status is a non-2xx status code, and `body`
set to your response schema for status codes defined in your contract, or `unknown` for status codes not in your contract.

The `Error` type is included because requests can fail without returning a response. See [Fetch#Exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#exceptions) for more information.

```html
<template>
  <div>
    <!-- Loading -->
    <template v-if="isPending">Loading...</template>

    <!-- Errors -->
    <template v-if="error">
      <template v-if="isFetchError(error)">
        We could not retrieve this post. Please check your internet connection.
      </template>
      <template v-else-if="error.status === 404">Post not found</template>
      <template v-else>Unexpected error occurred</template>
    </template>

    <!-- Data -->
    <template v-else>
      <h1>{{ data.body.title }}</h1>
      <p>{{ data.body.content }}</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { isFetchError } from '@ts-rest/vue-query/v5';
  import { useQuery } from './tsr';

  const props = defineProps<{ id: string }>();
  const id = toRef(props, 'id');

  const tsr = useQuery();

  const { data, error, isPending } = tsr.getPost.useQuery({
    queryKey: ['posts', id],    // <- pass id as a Ref to auto-update the queryKey and refetch
    queryData: {
      params: { id },
    },
  });
</script>
```

## Fully Type-Safe Error Handling

In order to ensure that your code is handling all possible error cases, there are type guard functions that have been provided to help the handling of both expected and unexpected errors.

- `isFetchError(error)` - Returns `true` if the error is an instance of `Error` thrown by `fetch`.
- `isUnknownErrorResponse(error, contractEndpoint)` - Returns `true` if the error, if a response has been received but the status code is not defined in the contract.
- `isNotKnownResponseError(error, contractEndpoint)` - Combines `isFetchError` and `isUnknownErrorResponse`, in case you want to be able to quickly type guard into defined error responses in one statement.
- `exhaustiveGuard(error)` - Check if all possible error cases have been handled. Otherwise, you get a compile-time error.

We also return the `contractEndpoint` property from all composables, so you can easily pass it to the types guards without having to import the contract.

:::tip

Use functional components with `h()` render function or JSX to make error templates more readable.

:::

```html
<template>
  <div>
    <!-- Loading -->
    <template v-if="isPending">Loading...</template>

    <!-- Error -->
     <ErrorMessage v-if="error" :err="error" />

    <!-- Data -->
    <template v-else>
      <h1>{{ data.body.title }}</h1>
      <p>{{ data.body.content }}</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { h, unref, type MaybeRef } from 'vue'
  import { isFetchError, isUndefinedErrorResponse, exhaustiveGuard } from '@ts-rest/vue-query/v5';
  import { useClient } from './tsr';

  const props = defineProps<{ id: string }>();
  const id = toRef(props, 'id')

  const tsr = useQuery();

  const { data, error, isPending, contractEndpoint } = tsr.getPost.useQuery({
    queryKey: ['posts', id],
    queryData: {
      params: { id },
    },
  });

  type Unref<T> = T extends Ref<infer U> ? U : never
  const ErrorMessage: FunctionalComponent<{ err: NonNullable<Unref<typeof error>> }> = ({ err }) => {
    if (isFetchError(err)) {
      return h('div', { innerHTML: 'We could not retrieve this post. Please check your internet connection.' });
    }
    
    if (isUndefinedErrorResponse(err, contractEndpoint)) {
      return h('div', { innerHTML: 'Unexpected error occurred' });
    }

    if (err.status === 404) {
      return h('div', { innerHTML: 'Post not found' });
    }

    // this should be unreachable code if you handle all possible error cases
    // if not, you will get a compile-time error on the line below
    return exhaustiveGuard(err);
  }
</script>
```
