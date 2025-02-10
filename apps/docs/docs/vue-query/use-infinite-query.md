# useInfiniteQuery

For the infinite query composable `useInfiniteQuery`, `queryData` should be a function that maps a context object containing `pageParam` to the actual query data.

```html
<template>
  <div>
    <!-- Loading -->
    <template v-if="isLoading">Loading...</div>

    <!-- Error -->
    <template v-else-if="isError">Error</div>

    <!-- Data -->
    <template v-else>
      <ul>
        <li v-for="post in posts" :key="post.id">{{ post.title }}</li>
      </ul>
      <button @click="fetchNextPage()">Load more</button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useClient } from './tsr';

const PAGE_SIZE = 5;

const tsr = useClient();

const { data, isLoading, isError, fetchNextPage, hasNextPage } = tsr.getPosts.useInfiniteQuery({
  queryKey: ['posts'],
  queryData: ({ pageParam }) => ({
    query: {
      skip: pageParam.skip,
      take: pageParam.take,
    },
  }),
  initialPageParam: { skip: 0, take: PAGE_SIZE },
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.body.posts.length >= PAGE_SIZE
      ? { take: PAGE_SIZE, skip: allPages.length * PAGE_SIZE }
      : undefined;
  },
});

const posts = computed(() => data.value.pages.flatMap((page) =>
  page.status === 200 ? page.body.posts : [],
));
</script>
```

See the [official `useInfiniteQuery()` docs](https://tanstack.com/query/v5/docs/framework/vue/reference/useInfiniteQuery) for more information.

## QueryClient Methods

You can also use `fetchInfiniteQuery` and `prefetchInfiniteQuery` on the ts-rest extended `QueryClient`.

These will take the same arguments as `fetchQuery`, but need to specify an `initialPageParam` in order to correctly put the data in the cache with its corresponding `pageParam`.

```ts
import { useQueryClient } from './tsr';

const tsrQueryClient = useQueryClient();
  
const initialPageParam = { skip: 0, take: 10 };
await tsrQueryClient.getPosts.prefetchInfiniteQuery({
  queryKey: ['posts'],
  queryData: {
    query: initialPageParam,
  },
  initialPageParam,
});
```
