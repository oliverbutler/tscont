# useQueries

You can also fetch multiple queries at once using `useQueries`. It can be useful for fetching multiple queries, usually from the same endpoint.

ts-rest currently does not support multiple queries from different endpoints. While it is an uncommon use case, we are open to implementing it in the future.

```html
<template>
  <div>
    <template v-if="pending">Loading...</div>
    <template v-else>
      <p v-for="query in queries" :key="query.data?.body.id">{{ query.data?.body.title }}</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useClient } from './tsr';

const props = defineProps<{ ids: string[] }>()
const ids = toRef(props, 'ids');

const tsr = useClient();

const { data, pending } = tsr.posts.get.useQueries({
  queries: computed(() => ids.value.map((id) => ({
    queryKey: ['posts', id],   // <- update of queryKey triggers new request, when 'ids' prop changes
    queryData: {
      params: { id }
    },
  }))),
  combine: (results) => {
    return {
      data: results.map((result) => result.data),
      pending: results.some((result) => result.isPending),
    }
  },
});
</script>
```

See the [official `useQueries()` docs](https://tanstack.com/query/v5/docs/react/reference/useQueries) for more information.
