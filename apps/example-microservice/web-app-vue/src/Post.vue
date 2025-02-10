<template>
  <div class="post">
    <h4>{{ title }} | {{ id }}</h4>

    <p>{{ content }}</p>

    <label for="published">Published:</label>
    <input id="published" type="checkbox" v-model="published" />

    <button
      @click="
        mutateUpdate({
          params: { id: props.id },
          body: updatedPost,
        })
      "
    >
      Save
    </button>

    <pre v-if="data"
      >{{ data.body }}
    </pre>

    <button @click="deletePost(id)">Delete</button>
  </div>
</template>

<script lang="ts" setup>
import type { Post } from '@ts-rest/example-contracts';
import { useClient } from './api/client';
import { computed, ref } from 'vue';

type Props = Post;

const props = defineProps<Props>();
const emit = defineEmits<{ delete: [id: string] }>();

const published = ref(props.published);
const updatedPost = computed(() => ({
  title: props.title,
  content: props.content ?? undefined,
  description: props.description ?? undefined,
  published: published.value,
}));

const { mutate: mutateUpdate, data } = useClient().updatePost.useMutation();
const { mutate: mutateDelete } = useClient().deletePost.useMutation();

const deletePost = (id: string) => {
  mutateDelete(
    { params: { id } },
    {
      onSuccess: () => emit('delete', id),
    },
  );
};
</script>

<style scoped>
.post {
  border: 1px solid black;
  padding: 1rem;
  margin: 1rem 0;
}
</style>
