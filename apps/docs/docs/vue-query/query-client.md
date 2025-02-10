# QueryClient

In addition to the composables provided, `@ts-rest/vue-query` also provides an extended version of `QueryClient` that is fully type-safe.

You can inject it with `useQueryClient()` from [`createTsRestPlugin`](/docs/vue-query/create-ts-rest-plugin).

It follows the same structure as your contract, and can be used the same way as the original `QueryClient` with similar function
signatures to the ts-rest composables for functions such as `queryClient.fetchQuery` and it's respective `useQuery` composable.

```html
<template>
  <div>
    <!-- Loading -->
    <template v-if="isLoading">Loading...</template>

    <!-- Error -->
    <template v-else-if="data?.status !== 200">Error</template>

    <!-- Data -->
    <template v-else>
      <button @click="createPost()">Create Post</button>
      <p v-for="post in data.body" :key="post.id">{{ post.title }}</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useClient, useQueryClient } from './tsr';

const POSTS_QUERY_KEY = ['posts'];

const tsr = useClient();
const tsrQueryClient = useQueryClient();

const { data, isLoading } = tsr.posts.get.useQuery({ queryKey: POSTS_QUERY_KEY });
const { mutate } = tsr.posts.create.useMutation();

const createPost = async () => {
  return mutate(
    { body: { title: 'Hello World' } },
    {
      onSuccess: async (data) => {
        //  this is typed ^
        tsrQueryClient.posts.get.setQueryData(POSTS_QUERY_KEY, (oldPosts) => {
          //                                     this is also typed ^
          return {
            ...oldPosts,
            body: [...oldPosts.body, data.body],
          };
        });
      },
    },
  );
};
</script>
```

## Non-Wrapped Functions

For functions that do not consume or provide typed data such as `queryClient.invalidateQueries()`, it makes no sense to wrap these and access them through an endpoint path such as `tsrQueryClient.posts.get.invalidateQueries()`.
As such, these functions are provided as-is at the root level of the `tsr.useQueryClient()` instance.

You can actually use the `QueryClient` returned from `tsr.useQueryClient()` anywhere you would normally use a `QueryClient` instance, as under the hood
we use the `QueryClient` returned from `@tanstack/vue-query`'s `useQueryClient()`, and we simply extend it with the ts-rest functions.

