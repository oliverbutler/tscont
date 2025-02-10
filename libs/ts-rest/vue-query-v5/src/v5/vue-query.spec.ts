import '@testing-library/jest-dom';
import { QueryClient, skipToken } from '@tanstack/vue-query';
import { waitFor } from '@testing-library/vue';
import { ApiFetcher, initContract } from '@ts-rest/core';
import { z } from 'zod';
import { createTsRestPlugin } from './create-ts-rest-plugin';
import {
  isFetchError,
  isNotKnownResponseError,
  isUnknownErrorResponse,
  exhaustiveGuard,
} from './type-guards';
import { defineComponent, unref } from 'vue-demi';
import { shallowMount } from '@vue/test-utils';

// mute errors at ErrorBoundary when using suspense functions
window.addEventListener('error', (event) => {
  event.preventDefault();
});

const noop = (...args: any[]) => {};

const c = initContract();

export type Post = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  published: boolean;
  authorId: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
};

const postsRouter = c.router(
  {
    getPost: {
      method: 'GET',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post>(),
        404: c.type<{ message: 'not found' }>(),
      },
    },
    getPosts: {
      method: 'GET',
      path: '/posts',
      responses: {
        200: c.type<{ posts: Post[] }>(),
      },
      query: z.object({
        take: z.number().optional(),
        skip: z.number().optional(),
      }),
    },
    createPost: {
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({
        title: z.string(),
        content: z.string(),
        published: z.boolean().optional(),
        description: z.string().optional(),
        authorId: z.string(),
      }),
    },
    mutationWithQuery: {
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({}),
      query: z.object({
        test: z.string(),
      }),
    },
    updatePost: {
      method: 'PUT',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post>(),
      },
      body: z.object({
        title: z.string(),
        content: z.string(),
        published: z.boolean().optional(),
        description: z.string().optional(),
        authorId: z.string(),
      }),
    },
    patchPost: {
      method: 'PATCH',
      path: `/posts/:id`,
      responses: {
        200: c.type<Post>(),
      },
      body: null,
    },
    deletePost: {
      method: 'DELETE',
      path: `/posts/:id`,
      responses: {
        200: c.type<boolean>(),
      },
      body: null,
    },
    uploadImage: {
      method: 'POST',
      path: `/posts/:id/image`,
      responses: {
        200: c.type<Post>(),
      },
      contentType: 'multipart/form-data',
      body: c.body<{ image: File }>(),
    },
  },
  {
    baseHeaders: z.object({
      'x-test': z.string(),
    }),
  },
);

// Three endpoints, two for posts, and one for health
const contract = c.router({
  posts: postsRouter,
  health: {
    method: 'GET',
    path: '/health',
    responses: {
      200: c.type<{ message: string }>(),
    },
  },
});

let api = jest.fn();

let queryClient = new QueryClient();

const tsr = createTsRestPlugin(contract, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'x-test': 'test',
  },
  api: api as ApiFetcher,
});

const SUCCESS_RESPONSE = {
  status: 200,
  body: {
    posts: [],
  },
};

const ERROR_RESPONSE = {
  status: 500,
  body: {
    message: 'Internal Server Error',
  },
};

const createComponent = <T>(cb: () => T) =>
  shallowMount(
    defineComponent({
      name: 'test',
      setup() {
        const result = cb();
        return { ...result };
      },
      template: '<div></div>',
    }),
    { global: { plugins: [[tsr.TsRestPlugin, { queryClient }]] } },
  ).vm;

describe('vue-query', () => {
  beforeEach(() => {
    api.mockReset();
    queryClient = new QueryClient();
  });

  it('useQuery should handle success', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().health.useQuery({ queryKey: ['health'] }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);
    expect(unref(result.isPending)).toStrictEqual(true);
    expect(unref(result.contractEndpoint)).toEqual(contract.health);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
    });

    expect(unref(result.data)).toStrictEqual(SUCCESS_RESPONSE);
  });

  it('useQuery should handle skipToken', async () => {
    const { result } = createComponent(() => ({
      result: tsr.useClient().health.useQuery({
        queryKey: ['health'],
        queryData: skipToken,
      }),
    }));

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(true);
    });

    expect(unref(result.data)).toStrictEqual(undefined);
    expect(api).toHaveBeenCalledTimes(0);
  });

  it('useQuery should handle error response', async () => {
    api.mockResolvedValue({
      status: 404,
      body: { message: 'not found' },
    });

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.getPost.useQuery({
        queryKey: ['posts', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
        retry: false,
      }),
    }));
    expect(unref(result.contractEndpoint)).toEqual(contract.posts.getPost);

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
    });

    const useQueryResult = unref(result.error);

    expect(useQueryResult).toEqual({
      status: 404,
      body: { message: 'not found' },
    });

    if (unref(result.isPending)) {
      throw new Error('isPending should be false');
    }

    if (useQueryResult == null) {
      throw new Error('error should not be null');
    }

    try {
      // @ts-expect-error - `error` could be `Error` exception
      noop(useQueryResult.body.message);
    } catch {
      /* empty */
    }

    if (unref(result.isError)) {
      if (
        !isNotKnownResponseError(useQueryResult, unref(result.contractEndpoint))
      ) {
        // excluded both `Error` type and unknown responses
        noop(useQueryResult.body.message);
      }

      try {
        // @ts-expect-error - `error` could be `Error` exception
        noop(useQueryResult.body.message);
      } catch {
        /* empty */
      }

      if (isFetchError(useQueryResult)) {
        throw new Error(
          'result.error should be a response, got `Error` instead',
        );
      }

      try {
        // @ts-expect-error - `status` could be one that is undefined in contract, so `body` is unknown
        noop(useQueryResult.body.message);
      } catch {
        /* empty */
      }

      if (
        isUnknownErrorResponse(useQueryResult, unref(result.contractEndpoint))
      ) {
        throw new Error(
          `result.status should be 404, got ${unref(result.status)} instead`,
        );
      }

      if (useQueryResult.status === 404) {
        // can safely access `body.message` because we excluded non-response Errors and undefined responses
        return expect(useQueryResult.body.message).toEqual('not found');
      }

      return exhaustiveGuard(useQueryResult);
    }

    // can safely access `data.body` because we excluded isPending and isError
    noop(unref(result.data)?.body.title);
  });

  it('useInfiniteQuery should handle success', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const PAGE_SIZE = 10;

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.getPosts.useInfiniteQuery({
        queryKey: ['posts'],
        queryData: ({ pageParam }) => ({
          query: {
            skip: pageParam.skip,
            take: pageParam.take,
          },
        }),
        initialPageParam: { skip: 0, take: PAGE_SIZE },
        getNextPageParam: (lastPage, allPages) => {
          if (lastPage.status !== 200) return undefined;

          return lastPage.body.posts.length >= PAGE_SIZE
            ? { take: PAGE_SIZE, skip: allPages.length * PAGE_SIZE }
            : undefined;
        },
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);
    expect(unref(result.isPending)).toStrictEqual(true);
    expect(unref(result.contractEndpoint)).toEqual(contract.posts.getPosts);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts?skip=0&take=10',
      body: undefined,
      rawQuery: {
        skip: 0,
        take: 10,
      },
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPosts,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
    });

    expect(unref(result.data)).toStrictEqual({
      pageParams: [{ skip: 0, take: PAGE_SIZE }],
      pages: [SUCCESS_RESPONSE],
    });
  });

  it('useQuery with select should handle success', async () => {
    api.mockResolvedValue({ status: 200, body: { message: 'hello world' } });

    const { result } = createComponent(() => ({
      result: tsr.useClient().health.useQuery({
        queryKey: ['health'],
        select: (data) => data.body.message,
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
    });

    expect(unref(result.data)).toStrictEqual('hello world');
  });

  it('useQuery should accept extra headers', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
          headers: {
            'x-test': 'test',
          },
        },
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should override base headers', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
          headers: {
            'x-test': 'foo',
          },
          extraHeaders: {
            'content-type': 'application/xml',
          },
        },
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'content-type': 'application/xml',
        'x-test': 'foo',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should remove header if value is undefined', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
          extraHeaders: {
            'content-type': undefined,
          },
        },
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('useQuery should accept non-json string response', () => {
    api.mockResolvedValue({
      status: 200,
      body: 'Hello World',
    });

    const { result } = createComponent(() => ({
      result: tsr.useClient().health.useQuery({
        queryKey: ['health'],
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    return waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
      expect(unref(result.data)).toStrictEqual({
        status: 200,
        body: 'Hello World',
      });
    });
  });

  it('useQuery should handle failure', async () => {
    api.mockResolvedValue(ERROR_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().health.useQuery({
        queryKey: ['health'],
        retry: false,
      }),
    }));

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/health',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.health,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
    });

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.error)).toStrictEqual(ERROR_RESPONSE);
  });

  it('should handle mutation', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useClient().posts.createPost.useMutation(),
    }));

    expect(unref(result.contractEndpoint)).toEqual(contract.posts.createPost);

    expect(unref(result.data)).toStrictEqual(undefined);

    expect(unref(result.isPending)).toStrictEqual(false);

    expect(unref(result.error)).toStrictEqual(null);

    await result.mutateAsync({
      body: {
        description: 'test',
        title: 'test',
        content: '',
        authorId: '1',
      },
    });

    expect(api).toHaveBeenCalledWith({
      method: 'POST',
      path: 'https://api.com/posts',
      body: JSON.stringify({
        description: 'test',
        title: 'test',
        content: '',
        authorId: '1',
      }),
      headers: {
        'content-type': 'application/json',
        'x-test': 'test',
      },
      rawBody: {
        authorId: '1',
        content: '',
        description: 'test',
        title: 'test',
      },
      contentType: 'application/json',
      route: contract.posts.createPost,
      signal: undefined,
      fetchOptions: {},
    });

    await waitFor(() => {
      expect(unref(result.data)).not.toBeUndefined();
    });

    expect(unref(result.data)).toStrictEqual(SUCCESS_RESPONSE);
  });

  it('useQueries should handle success', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPost.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                params: {
                  id: '1',
                },
              },
            },
            {
              queryKey: ['posts', '2'],
              queryData: {
                params: {
                  id: '2',
                },
              },
            },
          ],
        }),
      },
    }));

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[0].isPending).toStrictEqual(true);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[1].isPending).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/2',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.wrapper)[0].isPending).toStrictEqual(false);
      expect(unref(result.wrapper)[1].isPending).toStrictEqual(false);
    });

    expect(unref(result.wrapper)[0].data).toStrictEqual(SUCCESS_RESPONSE);

    expect(unref(result.wrapper)[1].data).toStrictEqual(SUCCESS_RESPONSE);
  });

  it('useQueries should handle skipToken', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPost.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                params: {
                  id: '1',
                },
              },
            },
            {
              queryKey: ['posts', '2'],
              queryData: skipToken,
            },
          ],
        }),
      },
    }));

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[0].isPending).toStrictEqual(true);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[1].isPending).toStrictEqual(true);

    await waitFor(() => {
      expect(unref(result.wrapper)[0].isPending).toStrictEqual(false);
      expect(unref(result.wrapper)[1].isPending).toStrictEqual(true);
    });

    expect(unref(result.wrapper)[0].data).toStrictEqual(SUCCESS_RESPONSE);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    expect(api).toHaveBeenCalledTimes(1);
  });

  it('useQueries should handle `select`', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPosts.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                query: { take: 10 },
              },
            },
            {
              queryKey: ['posts', '2'],
              queryData: {
                query: { skip: 10, take: 10 },
              },
              select: (data) => {
                return data.body.posts.length;
              },
            },
          ],
        }),
      },
    }));

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[0].isPending).toStrictEqual(true);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[1].isPending).toStrictEqual(true);

    await waitFor(() => {
      expect(unref(result.wrapper)[0].isPending).toStrictEqual(false);
      expect(unref(result.wrapper)[1].isPending).toStrictEqual(false);
    });

    expect(unref(result.wrapper)[0].data?.body.posts).toStrictEqual(
      SUCCESS_RESPONSE.body.posts,
    );

    expect(unref(result.wrapper)[1].data?.toFixed(5)).toStrictEqual('0.00000');
  });

  it('useQueries should handle `combine`', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPosts.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                query: { take: 10 },
              },
            },
            {
              queryKey: ['posts', '2'],
              queryData: {
                query: { skip: 10, take: 10 },
              },
            },
          ],
          combine: (results) => {
            return {
              data: results.map((result) => result.data),
              pending: results.some((result) => result.isPending),
            };
          },
        }),
      },
    }));

    expect(unref(result.wrapper).data).toHaveLength(2);
    expect(unref(result.wrapper).pending).toStrictEqual(true);

    await waitFor(() => {
      expect(unref(result.wrapper).pending).toStrictEqual(false);
    });

    expect(unref(result.wrapper).data).toEqual([
      SUCCESS_RESPONSE,
      SUCCESS_RESPONSE,
    ]);
  });

  it('useQueries should handle failure', async () => {
    api.mockResolvedValue(ERROR_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPost.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                params: {
                  id: '1',
                },
              },
              retry: false,
            },
            {
              queryKey: ['posts', '2'],
              queryData: {
                params: {
                  id: '2',
                },
              },
              retry: false,
            },
          ],
        }),
      },
    }));

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);

    expect(unref(result.wrapper)[0].isLoading).toStrictEqual(true);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);

    expect(unref(result.wrapper)[1].isLoading).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/2',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.wrapper)[0].failureCount).toStrictEqual(1);
    });

    await waitFor(() => {
      expect(unref(result.wrapper)[1].failureCount).toStrictEqual(1);
    });

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[0].error).toStrictEqual(ERROR_RESPONSE);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[1].error).toStrictEqual(ERROR_RESPONSE);
  });

  it('useQueries should handle success and failure', async () => {
    api
      .mockResolvedValueOnce(SUCCESS_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE);

    const { result } = createComponent(() => ({
      result: {
        wrapper: tsr.useClient().posts.getPost.useQueries({
          queries: [
            {
              queryKey: ['posts', '1'],
              queryData: {
                params: {
                  id: '1',
                },
              },
              retry: false,
            },
            {
              queryKey: ['posts', '2'],
              queryData: {
                params: {
                  id: '2',
                },
              },
              retry: false,
            },
          ],
        }),
      },
    }));

    expect(unref(result.wrapper)[0].data).toStrictEqual(undefined);

    expect(unref(result.wrapper)[0].isLoading).toStrictEqual(true);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);

    expect(unref(result.wrapper)[1].isLoading).toStrictEqual(true);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/2',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });

    await waitFor(() => {
      expect(unref(result.wrapper)[0].isLoading).toStrictEqual(false);
    });

    await waitFor(() => {
      expect(unref(result.wrapper)[1].isLoading).toStrictEqual(false);
    });

    expect(unref(result.wrapper)[0].data).toStrictEqual(SUCCESS_RESPONSE);

    expect(unref(result.wrapper)[1].data).toStrictEqual(undefined);
    expect(unref(result.wrapper)[1].error).toStrictEqual(ERROR_RESPONSE);
  });

  it('fetchQuery should handle success', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    createComponent(() => {
      tsr.useQueryClient().posts.getPost.fetchQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
      });
    });

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('fetchQuery should handle failure', async () => {
    api.mockResolvedValue(ERROR_RESPONSE);

    const { result } = createComponent(() => ({
      result: tsr.useQueryClient().posts.getPost.fetchQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
      }),
    }));

    expect(result).rejects.toStrictEqual(ERROR_RESPONSE);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('getQueryData should return already fetched data', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result, queryClient } = createComponent(() => ({
      result: tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
      }),
      queryClient: tsr.useQueryClient(),
    }));

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(false);
      expect(api).toHaveBeenCalledTimes(1);
    });

    const cachedResult = queryClient.posts.getPost.getQueryData(['post', '1']);

    expect(cachedResult).toStrictEqual(SUCCESS_RESPONSE);

    expect(api).toHaveBeenCalledTimes(1);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('setQueryData should overwrite data returned from api', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const data = {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      body: {
        id: '1',
        title: 'foo',
        description: 'bar',
        authorId: '1',
        content: 'baz',
        published: true,
      } as Post,
    } as const;

    const { result, queryClient } = createComponent(() => {
      const result = tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
        staleTime: 10000,
      });
      return { result, queryClient: tsr.useQueryClient() };
    });

    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(1);
      expect(unref(result.isPending)).toStrictEqual(false);
      expect(unref(result.data)).toStrictEqual(SUCCESS_RESPONSE);
    });

    queryClient.posts.getPost.setQueryData(['post', '1'], data);

    return waitFor(() => {
      expect(api).toHaveBeenCalledTimes(1);
      expect(unref(result.isPending)).toStrictEqual(false);
      expect(unref(result.data)).toStrictEqual(data);
    });
  });

  it('removeQueries should remove fetched data', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    createComponent(() => {
      return tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
      });
    });

    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));

    createComponent(() => {
      const queryClient = tsr.useQueryClient();
      return queryClient.removeQueries({ queryKey: ['post', '1'] });
    });

    const { result } = createComponent(() => ({
      result: tsr.useQueryClient().posts.getPost.getQueryData(['post', '1']),
    }));

    expect(unref(result)).toStrictEqual(undefined);

    expect(api).toHaveBeenCalledTimes(1);

    expect(api).toHaveBeenCalledWith({
      method: 'GET',
      path: 'https://api.com/posts/1',
      body: undefined,
      headers: {
        'x-test': 'test',
      },
      route: contract.posts.getPost,
      signal: expect.any(AbortSignal),
      fetchOptions: {
        signal: expect.any(AbortSignal),
      },
    });
  });

  it('refetchQueries should trigger query again', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result, queryClient } = createComponent(() => {
      const result = tsr.useClient().posts.getPost.useQuery({
        queryKey: ['post', '1'],
        queryData: {
          params: {
            id: '1',
          },
        },
      });
      return { result, queryClient: tsr.useQueryClient() };
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toBe(false);
      expect(api).toHaveBeenCalledTimes(1);
    });

    queryClient.refetchQueries({ queryKey: ['post', '1'] });

    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  });

  it('useClient should throw if not using provider', async () => {
    const component = () =>
      shallowMount(
        defineComponent({
          name: 'test',
          setup() {
            const tmp = console.warn;

            let result;

            try {
              console.warn = jest.fn();
              result = tsr.useClient();
            } finally {
              console.warn = tmp;
            }

            return { result };
          },
          template: '<div></div>',
        }),
      );

    expect(component).toThrow(
      'Client not initialized. Use TsRestPlugin to initialize one.',
    );
  });

  it('useClientOptions should re-init client if options change', async () => {
    api.mockResolvedValue(SUCCESS_RESPONSE);

    const { result } = createComponent(() => {
      const options = tsr.useClientOptions();

      const result = tsr
        .useClient()
        .health.useQuery({ queryKey: ['health', () => options.value.baseUrl] });

      options.value.baseUrl = 'https://other-api.com';

      return { result };
    });

    await waitFor(() => {
      expect(unref(result.isPending)).toStrictEqual(true);
    });

    expect(api).toHaveBeenCalledTimes(2);
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'https://api.com/health' }),
    );
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'https://other-api.com/health' }),
    );
  });
});
