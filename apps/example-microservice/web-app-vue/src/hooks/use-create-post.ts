import { Post } from '@ts-rest/example-contracts';
import { ref, watch } from 'vue';
import { useClient } from '../api/client';

export const useCreateMockPost = () => {
  const { data, mutate } = useClient().createPost.useMutation();
  const posts = ref<Post[]>([]);

  watch(data, (newPost) => {
    if (newPost) posts.value.push(newPost.body);
  });

  const createMockPost = () => {
    mutate({
      body: {
        title: `mock post ${posts.value.length}`,
        content: `mock content ${posts.value.length}`,
        description: `mock description ${posts.value.length}`,
        published: true,
      },
    });
  };

  return { posts, createMockPost };
};
