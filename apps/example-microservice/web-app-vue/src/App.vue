<template>
  <main>
    <h1>Posts from posts-service</h1>

    <section>
      <h2>Create Post</h2>
      <div v-if="isFetching">Loading...</div>
      <div v-if="error">Error: {{ error }}</div>

      <button @click="createMockPost()">Create mock post</button>

      <h3>Latest post</h3>
      <Post
        v-if="data?.body && isSuccess"
        v-bind="data.body"
        @delete="onDelete($event)"
      />

      <h3>All created posts</h3>
      <Post
        v-for="post in createdPosts"
        :key="post.id"
        v-bind="post"
        @delete="onDelete($event)"
      />
    </section>

    <section>
      <h2>Infinite query posts</h2>
      hasNext: {{ hasNextPage }}
      <Post
        v-for="post in infinitePosts"
        :key="post.id"
        v-bind="post"
        @delete="onDelete($event)"
      ></Post>
      <button @click="fetchNextPage()">load more</button>
    </section>
  </main>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useClient } from './api/client';
import { useCreateMockPost } from './hooks/use-create-post';
import { useInfinitePosts } from './hooks/use-infinite-posts';
import Post from './Post.vue';

const { posts: createdPosts, createMockPost } = useCreateMockPost();
const {
  posts: infinitePosts,
  fetchNextPage,
  hasNextPage,
  refetch: refetchInfinite,
} = useInfinitePosts();

const postId = computed(
  () => createdPosts.value[createdPosts.value.length - 1]?.id,
);

const { data, error, isFetching, isSuccess } = useClient().getPost.useQuery({
  queryKey: ['posts', postId] as const,
  queryData: { params: { id: postId } },
  // queryData: () => ({ params: { id: postId.value } }),
  enabled: computed(() => !!postId.value),
});

const onDelete = (id: string) => {
  const index = createdPosts.value.findIndex((post) => post.id === id);
  createdPosts.value.splice(index, 1);

  refetchInfinite();
};
</script>

<style scoped>
main {
  max-width: 800px;
  margin: 0 auto;
}

section {
  margin: 8rem 0;
}
</style>
