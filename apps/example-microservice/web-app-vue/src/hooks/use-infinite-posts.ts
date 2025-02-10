import { computed } from 'vue';
import { useClient } from '../api/client';

export const useInfinitePosts = () => {
  const PAGE_SIZE = 5;

  const { data, ...rest } = useClient().getPosts.useInfiniteQuery({
    queryKey: ['infinite-posts'],
    queryData: ({ pageParam }) => ({
      query: {
        skip: pageParam.skip.toString(),
        take: pageParam.take.toString(),
      },
    }),
    initialPageParam: { skip: 0, take: PAGE_SIZE },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.status !== 200) return undefined;

      return lastPage.body.count > PAGE_SIZE - 1
        ? { take: PAGE_SIZE, skip: allPages.length * PAGE_SIZE }
        : undefined;
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 5,
  });

  const posts = computed(
    () => data.value?.pages.flatMap((page) => page.body.posts) ?? [],
  );

  return { posts, ...rest };
};
