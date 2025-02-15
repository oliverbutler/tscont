import * as fetchMock from 'fetch-mock-jest';
import {
  FetchOptions,
  HTTPStatusCode,
  initContract,
  OverrideableClientArgs,
  ResponseValidationError,
} from '..';
import { ApiFetcherArgs, initClient } from './client';
import { Equal, Expect } from './test-helpers';
import { z } from 'zod';
import { ValidationError } from './validation-error';

const c = initContract();

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  published: z.boolean(),
  authorId: z.string(),
});
export type Post = z.infer<typeof postSchema>;

export type User = {
  id: string;
  email: string;
  name: string | null;
};

const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    headers: z.object({
      'x-api-key': z.string().optional(),
    }),
    responses: {
      200: postSchema.nullable(),
    },
  },
  getPosts: {
    method: 'GET',
    path: '/posts',
    headers: z.object({
      'x-pagination': z.coerce.number().optional(),
    }),
    responses: {
      200: c.type<Post[]>(),
    },
    query: z.object({
      take: z.number().optional(),
      skip: z.number().optional(),
      order: z.string().optional(),
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
  echoPostXForm: {
    method: 'POST',
    path: '/echo',
    contentType: 'application/x-www-form-urlencoded',
    body: z.object({
      foo: z.string(),
      bar: z.string(),
    }),
    responses: {
      200: c.otherResponse({
        contentType: 'text/plain',
        body: z.string(),
      }),
    },
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
    headers: z.object({
      'content-type': z.literal('application/merge-patch+json'),
    }),
    body: z.object({}).passthrough(),
  },
  deletePost: {
    method: 'DELETE',
    path: `/posts/:id`,
    body: c.noBody(),
    responses: {
      204: c.noBody(),
    },
  },
  deletePostUndefinedBody: {
    method: 'DELETE',
    path: `/posts/:id`,
    responses: {
      204: c.noBody(),
    },
  },
});

// Three endpoints, two for posts, and one for health
export const router = c.router(
  {
    posts: postsRouter,
    health: {
      method: 'GET',
      path: '/health',
      responses: {
        200: c.type<{ message: string }>(),
      },
    },
    upload: {
      method: 'POST',
      path: '/upload',
      body: c.type<{ file: File }>(),
      responses: {
        200: c.type<{ message: string }>(),
      },
      contentType: 'multipart/form-data',
    },
    uploadArray: {
      method: 'POST',
      path: '/upload-array',
      body: c.type<{ files: File[] }>(),
      responses: {
        200: c.type<{ message: string }>(),
      },
      contentType: 'multipart/form-data',
    },
  },
  {
    baseHeaders: z.object({
      'x-api-key': z.string(),
      'x-test': z.string().optional(),
      'base-header': z.string().optional(),
    }),
  },
);

const routerStrict = c.router(router, {
  strictStatusCodes: true,
});

const client = initClient(router, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'X-Api-Key': 'foo',
  },
});

const clientWithoutBaseHeaders = initClient(router, {
  baseUrl: 'https://api.com',
});

const clientStrict = initClient(routerStrict, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'X-Api-Key': 'foo',
  },
});

type ClientGetPostsType = Expect<
  Equal<
    Parameters<typeof client.posts.getPosts>[0],
    | {
        query?: {
          take?: number;
          skip?: number;
          order?: string;
        };
        headers?: {
          'x-pagination'?: number;
          'x-test'?: string;
          'base-header'?: string;
          'x-api-key'?: string;
        };
        extraHeaders?: {
          'x-pagination'?: never;
          'x-test'?: never;
          'base-header'?: never;
          'x-api-key'?: never;
        } & Record<string, string | undefined>;
        fetchOptions?: FetchOptions;
        overrideClientOptions?: Partial<OverrideableClientArgs>;
        cache?: FetchOptions['cache'];
      }
    | undefined
  >
>;

type ClientWithoutBaseHeadersGetPostsType = Expect<
  Equal<
    Parameters<typeof clientWithoutBaseHeaders.posts.getPosts>[0],
    {
      query?: {
        take?: number;
        skip?: number;
        order?: string;
      };
      headers: {
        'x-pagination'?: number;
        'x-test'?: string;
        'base-header'?: string;
        'x-api-key': string;
      };
      extraHeaders?: {
        'x-pagination'?: never;
        'x-test'?: never;
        'base-header'?: never;
        'x-api-key'?: never;
      } & Record<string, string | undefined>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;
      cache?: FetchOptions['cache'];
    }
  >
>;

type ClientGetPostType = Expect<
  Equal<
    Parameters<typeof client.posts.getPost>[0],
    {
      params: {
        id: string;
      };
      headers?: {
        'x-test'?: string;
        'base-header'?: string;
        'x-api-key'?: string;
      };
      extraHeaders?: {
        'x-test'?: never;
        'base-header'?: never;
        'x-api-key'?: never;
      } & Record<string, string | undefined>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;
      cache?: FetchOptions['cache'];
    }
  >
>;
type RouterHealthStrict = Expect<
  Equal<(typeof routerStrict.health)['strictStatusCodes'], true>
>;
type RouterGetPostStrict = Expect<
  Equal<(typeof routerStrict.posts.getPost)['strictStatusCodes'], true>
>;
type HealthReturnType = Awaited<ReturnType<typeof clientStrict.health>>;
type ClientGetPostResponseType = Expect<
  Equal<
    HealthReturnType,
    { status: 200; body: { message: string }; headers: Headers }
  >
>;

describe('client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('get', () => {
    it('w/ no parameters', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPosts({});

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ no query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPosts({ query: {} });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ no parameters (not provided)', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPosts();

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts?take=10',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPosts({ query: { take: 10 } });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ json query parameters', async () => {
      const client = initClient(
        c.router({
          getPosts: {
            ...postsRouter.getPosts,
            query: postsRouter.getPosts.query.extend({
              published: z.boolean(),
              filter: z.object({
                title: z.string(),
              }),
            }),
          },
        }),
        {
          baseUrl: 'https://api.com',
          baseHeaders: {},
          jsonQuery: true,
        },
      );

      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: `https://api.com/posts?take=10&order=asc&published=true&filter=${encodeURIComponent(
            '{"title":"test"}',
          )}`,
        },
        { body: value, status: 200 },
      );

      const result = await client.getPosts({
        query: {
          take: 10,
          order: 'asc',
          published: true,
          filter: { title: 'test' },
        },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ undefined query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts?take=10',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPosts({
        query: { take: 10, skip: undefined },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
    });

    it('w/ sub path', async () => {
      const value = { key: 'value' };
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts/1',
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.getPost({ params: { id: '1' } });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
    });

    it('w/ a non json response (string, text/plain)', async () => {
      fetchMock.getOnce(
        {
          url: 'https://api.com/posts',
        },
        {
          headers: {
            'Content-Type': 'text/plain',
          },
          body: 'string',
          status: 200,
        },
      );

      const result = await client.posts.getPosts({});

      expect(result.body).toStrictEqual('string');
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('6');
      expect(result.headers.get('Content-Type')).toBe('text/plain');
    });
  });

  it('w/ a non json response (string, text/html)', async () => {
    fetchMock.getOnce(
      {
        url: 'https://api.com/posts',
      },
      {
        headers: {
          'Content-Type': 'text/html',
        },
        body: 'string',
        status: 200,
      },
    );

    const result = await client.posts.getPosts({});

    expect(result.body).toStrictEqual('string');
    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Length')).toBe('6');
    expect(result.headers.get('Content-Type')).toBe('text/html');
  });

  describe('post', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };
      fetchMock.postOnce(
        {
          url: 'https://api.com/posts',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.createPost({
        body: { title: 'title', content: 'content', authorId: 'authorId' },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ query params', async () => {
      fetchMock.postOnce(
        {
          url: 'https://api.com/posts?test=test',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {},
        },
        { body: {}, status: 200 },
      );

      const result = await client.posts.mutationWithQuery({
        query: { test: 'test' },
        body: {},
      });

      expect(result.body).toStrictEqual({});
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('2');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('put', () => {
    it('w/ sub path and body', async () => {
      const value = { key: 'value' };
      fetchMock.putOnce(
        {
          url: 'https://api.com/posts/1',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            title: 'title',
            content: 'content',
            authorId: 'authorId',
          },
        },
        { body: value, status: 200 },
      );

      const result = await client.posts.updatePost({
        params: { id: '1' },
        body: { title: 'title', content: 'content', authorId: 'authorId' },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('patch', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };

      fetchMock.patchOnce(
        {
          url: 'https://api.com/posts/1',
        },
        (_, req) => ({
          body: {
            contentType: (req.headers as any)['content-type'],
            reqBody: JSON.parse(req.body as string),
          },
          status: 200,
        }),
      );

      const result = await client.posts.patchPost({
        params: { id: '1' },
        headers: {
          'content-type': 'application/merge-patch+json',
        },
        body: value,
      });

      expect(result.body).toEqual({
        contentType: 'application/merge-patch+json',
        reqBody: value,
      });
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('delete', () => {
    it('w/ no body', async () => {
      fetchMock.deleteOnce(
        {
          url: 'https://api.com/posts/1',
        },
        { status: 204 },
      );

      const result = await client.posts.deletePost({
        params: { id: '1' },
      });

      expect((result.body as Blob).size).toStrictEqual(0);
      expect(result.status).toBe(204);
      expect(result.headers.has('Content-Length')).toBe(false);
      expect(result.headers.has('Content-Type')).toBe(false);
    });

    it('w/ undefined body', async () => {
      fetchMock.deleteOnce(
        {
          url: 'https://api.com/posts/1',
        },
        { status: 204 },
      );

      const result = await client.posts.deletePostUndefinedBody({
        params: { id: '1' },
      });

      expect((result.body as Blob).size).toStrictEqual(0);
      expect(result.status).toBe(204);
      expect(result.headers.has('Content-Length')).toBe(false);
      expect(result.headers.has('Content-Type')).toBe(false);
    });
  });

  describe('multipart/form-data', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };
      fetchMock.postOnce(
        {
          url: 'https://api.com/upload',
        },
        { body: value, status: 200 },
      );

      const file = new File([''], 'filename', { type: 'text/plain' });

      const result = await client.upload({
        body: { file },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched(true, {
        matcher: (_, options) => {
          const formData = options.body as FormData;
          return formData.get('file') === file;
        },
      });
    });

    it('w/ FormData', async () => {
      const value = { key: 'value' };
      fetchMock.postOnce(
        {
          url: 'https://api.com/upload',
        },
        { body: value, status: 200 },
      );

      const formData = new FormData();
      formData.append('test', 'test');

      const result = await client.upload({
        body: formData,
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched(true, {
        matcher: (_, options) => {
          const formData = options.body as FormData;
          return formData.get('test') === 'test';
        },
      });
    });

    it('w/ File Array', async () => {
      const value = { key: 'value' };
      fetchMock.postOnce(
        {
          url: 'https://api.com/upload-array',
        },
        { body: value, status: 200 },
      );

      const files = [
        new File([''], 'filename-1', { type: 'text/plain' }),
        new File([''], 'filename-2', { type: 'text/plain' }),
      ];

      const result = await client.uploadArray({
        body: { files },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched(true, {
        matcher: (_, options) => {
          const formData = options.body as FormData;
          const formDataFiles = formData.getAll('files');
          return formDataFiles[0] === files[0] && formDataFiles[1] === files[1];
        },
      });
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    it('w/object', async () => {
      fetchMock.postOnce(
        {
          url: 'https://api.com/echo',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        },
        (_, req) => {
          expect(req.body).toBeInstanceOf(URLSearchParams);

          return {
            body: req.body!.toString(),
            status: 200,
          };
        },
      );

      const result = await client.posts.echoPostXForm({
        body: {
          foo: 'foo',
          bar: 'bar',
        },
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe(
        'text/plain;charset=UTF-8',
      );
      expect(result.body).toBe('foo=foo&bar=bar');
    });

    it('w/string', async () => {
      fetchMock.postOnce(
        {
          url: 'https://api.com/echo',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        },
        (_, req) => {
          expect(typeof req.body).toBe('string');

          return {
            body: req.body,
            status: 200,
          };
        },
      );

      const result = await client.posts.echoPostXForm({
        body: 'foo=foo&bar=bar',
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe(
        'text/plain;charset=UTF-8',
      );
      expect(result.body).toBe('foo=foo&bar=bar');
    });
  });

  describe('next', () => {
    it('should include "next" property in the fetch request', async () => {
      const client = initClient(router, {
        baseHeaders: {},
        baseUrl: 'http://localhost:5002',
      });

      globalThis.fetch = jest.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              id: '1',
              name: 'John',
              email: 'some@email',
            }),
          headers: new Headers({
            'content-type': 'application/json',
          }),
        } as Response),
      );

      await client.posts.getPost({
        headers: {
          'x-api-key': 'foo',
        },
        params: { id: '1' },
        fetchOptions: {
          next: {
            revalidate: 1,
            tags: ['user1'],
          },
        } as RequestInit,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/posts/1',
        {
          cache: undefined,
          headers: {
            'x-api-key': 'foo',
          },
          body: undefined,
          credentials: undefined,
          method: 'GET',
          signal: undefined,
          next: {
            revalidate: 1,
            tags: ['user1'],
          },
        },
      );
      (globalThis.fetch as jest.Mock).mockClear();
    });
  });
});

const argsCalledMock = jest.fn();

const customClient = initClient(router, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'Base-Header': 'foo',
  },
  api: async (
    args: ApiFetcherArgs & { uploadProgress?: (progress: number) => void },
  ) => {
    args.uploadProgress?.(10);

    // Do something with the path, body, etc.

    args.uploadProgress?.(100);

    argsCalledMock(args);

    return {
      status: 200,
      body: { message: 'Hello' },
      headers: new Headers(),
    };
  },
});

type CustomClientGetPostsType = Expect<
  Equal<
    Parameters<typeof customClient.posts.getPosts>[0],
    {
      query?: {
        take?: number;
        skip?: number;
        order?: string;
      };
      headers: {
        'x-pagination'?: number;
        'x-test'?: string;
        'base-header'?: string;
        'x-api-key': string;
      };
      extraHeaders?: {
        'x-pagination'?: never;
        'x-test'?: never;
        'base-header'?: never;
        'x-api-key'?: never;
      } & Record<string, string | undefined>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;
      cache?: FetchOptions['cache'];
      uploadProgress?: (progress: number) => void;
    }
  >
>;

type CustomClientGetPostType = Expect<
  Equal<
    Parameters<typeof customClient.posts.getPost>[0],
    {
      params: {
        id: string;
      };
      headers: {
        'x-test'?: string;
        'base-header'?: string;
        'x-api-key': string;
      };
      extraHeaders?: {
        'x-test'?: never;
        'base-header'?: never;
        'x-api-key'?: never;
      } & Record<string, string | undefined>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;
      cache?: FetchOptions['cache'];
      uploadProgress?: (progress: number) => void;
    }
  >
>;

describe('custom api', () => {
  beforeEach(() => {
    argsCalledMock.mockReset();
    fetchMock.mockReset();
  });

  it('should allow a uploadProgress attribute on the api call', async () => {
    const uploadProgress = jest.fn();
    await customClient.posts.getPost({
      headers: {
        'x-api-key': 'string',
      },
      params: { id: '1' },
      uploadProgress,
    });
    expect(uploadProgress).toBeCalledWith(10);
    expect(uploadProgress).toBeCalledWith(100);

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        uploadProgress,
      }),
    );
  });

  it('should allow extra headers to be passed in', async () => {
    await customClient.posts.getPost({
      params: { id: '1' },
      headers: {
        'x-api-key': 'foo',
        'x-test': 'test',
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'x-api-key': 'foo',
          'base-header': 'foo',
          'x-test': 'test',
        },
      }),
    );
  });

  it('extra headers should override base headers', async () => {
    await customClient.posts.getPost({
      params: { id: '1' },
      headers: {
        'x-api-key': 'foo',
        'base-header': 'bar',
      },
      extraHeaders: {
        'content-type': 'application/html',
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'x-api-key': 'foo',
          'base-header': 'bar',
          'content-type': 'application/html',
        },
      }),
    );
  });

  it('works for mutations', async () => {
    await customClient.posts.mutationWithQuery({
      query: { test: 'test' },
      body: {},
      headers: {
        'x-api-key': '123',
        'x-test': 'test',
      },
      uploadProgress: () => {
        // noop
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'x-api-key': '123',
          'base-header': 'foo',
          'content-type': 'application/json',
          'x-test': 'test',
        },
        uploadProgress: expect.any(Function),
      }),
    );
  });

  it('has correct types when throwOnUnknownStatus only is configured', async () => {
    const client = initClient(router, {
      baseUrl: 'https://api.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      throwOnUnknownStatus: true,
    });

    fetchMock.getOnce({ url: 'https://api.com/posts' }, { status: 200 });

    const result = await client.posts.getPosts({});

    type ClientGetPostsResponseStatusType = Expect<
      Equal<typeof result.status, HTTPStatusCode>
    >;
  });

  it('has correct types when strictStatusCode is configured', async () => {
    fetchMock.getOnce({ url: 'https://api.com/posts' }, { status: 200 });

    const result = await clientStrict.posts.getPosts({});

    type ClientGetPostsResponseStatusType = Expect<
      Equal<typeof result.status, 200>
    >;
  });

  it('throws an error when throwOnUnknownStatus is configured and response is unknown', async () => {
    const client = initClient(router, {
      baseUrl: 'https://isolated.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      throwOnUnknownStatus: true,
    });

    fetchMock.getOnce({ url: 'https://isolated.com/posts' }, { status: 419 });

    await expect(client.posts.getPosts({})).rejects.toThrowError(
      'Server returned unexpected response. Expected one of: 200 got: 419',
    );
  });

  it('throw an error when validateResponse is configured and response is invalid', async () => {
    const client = initClient(router, {
      baseUrl: 'https://isolated.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      validateResponse: true,
    });
    fetchMock.getOnce(
      { url: 'https://isolated.com/posts/1' },
      { status: 200, body: { key: 'invalid value' } },
    );

    await expect(
      client.posts.getPost({ params: { id: '1' } }),
    ).rejects.toThrowError(ValidationError);
  });
});
