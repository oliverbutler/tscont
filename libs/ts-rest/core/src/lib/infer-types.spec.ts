import { z } from 'zod';
import { initContract } from './dsl';
import { Equal, Expect } from './test-helpers';
import {
  ClientInferRequest,
  ServerInferRequest,
  ClientInferResponseBody,
  ServerInferResponseBody,
  ClientInferResponses,
  ServerInferResponses,
} from './infer-types';
import { HTTPStatusCode } from './status-codes';

const c = initContract();

const contract = c.router(
  {
    getPost: {
      method: 'GET',
      path: '/posts/:id',
      pathParams: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
      query: z.object({
        includeComments: z.boolean().default(false),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          title: z.string().default('Untitled'),
          content: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
      },
    },
    createPost: {
      method: 'POST',
      path: '/posts',
      body: z.object({
        title: z.string(),
        content: z.string(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
        }),
      },
    },
    uploadImage: {
      method: 'POST',
      path: '/images',
      contentType: 'multipart/form-data',
      body: c.body<{ image: File }>(),
      responses: {
        201: z.object({
          id: z.number(),
          url: z.string(),
        }),
      },
    },
    nested: {
      getComments: {
        method: 'GET',
        path: '/posts/:id/comments',
        pathParams: z.object({
          id: z.string().transform((id) => Number(id)),
        }),
        headers: z.object({
          'pagination-page': z.string().transform(Number),
        }),
        responses: {
          200: z.object({
            comments: z.array(
              z.object({
                id: z.number(),
                content: z.string(),
              })
            ),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
  {
    baseHeaders: z.object({
      Authorization: z.string(),
    }),
  }
);

it('type inference helpers', () => {
  type ServerInferResponsesTest = Expect<
    Equal<
      ServerInferResponses<typeof contract>,
      {
        getPost:
          | {
              status: 200;
              body: { title?: string | undefined; id: number; content: string };
            }
          | { status: 404; body: { message: string } }
          | { status: Exclude<HTTPStatusCode, 200 | 404>; body: unknown };
        createPost:
          | {
              status: 201;
              body: { id: number; title: string; content: string };
            }
          | { status: Exclude<HTTPStatusCode, 201>; body: unknown };
        uploadImage:
          | {
              status: 201;
              body: { id: number; url: string };
            }
          | { status: Exclude<HTTPStatusCode, 201>; body: unknown };
        nested: {
          getComments:
            | {
                status: 200;
                body: { comments: { id: number; content: string }[] };
              }
            | { status: 404; body: { message: string } }
            | { status: Exclude<HTTPStatusCode, 200 | 404>; body: unknown };
        };
      }
    >
  >;

  type ServerInferResponsesTest2 = Expect<
    Equal<
      ServerInferResponses<typeof contract, 200>,
      {
        getPost: {
          status: 200;
          body: { title?: string | undefined; id: number; content: string };
        };
        createPost: {
          status: 200;
          body: unknown;
        };
        uploadImage: {
          status: 200;
          body: unknown;
        };
        nested: {
          getComments: {
            status: 200;
            body: { comments: { id: number; content: string }[] };
          };
        };
      }
    >
  >;

  type ServerInferResponsesTest3 = Expect<
    Equal<
      ServerInferResponses<typeof contract, 401>,
      {
        getPost: {
          status: 401;
          body: unknown;
        };
        createPost: {
          status: 401;
          body: unknown;
        };
        uploadImage: {
          status: 401;
          body: unknown;
        };
        nested: {
          getComments: {
            status: 401;
            body: unknown;
          };
        };
      }
    >
  >;

  type ClientInferResponsesTest = Expect<
    Equal<
      ClientInferResponses<typeof contract>,
      {
        getPost:
          | {
              status: 200;
              body: { title: string; id: number; content: string };
            }
          | {
              status: 404;
              body: { message: string };
            }
          | { status: Exclude<HTTPStatusCode, 200 | 404>; body: unknown };
        createPost:
          | {
              status: 201;
              body: { id: number; title: string; content: string };
            }
          | { status: Exclude<HTTPStatusCode, 201>; body: unknown };
        uploadImage:
          | {
              status: 201;
              body: { id: number; url: string };
            }
          | { status: Exclude<HTTPStatusCode, 201>; body: unknown };
        nested: {
          getComments:
            | {
                status: 200;
                body: { comments: { id: number; content: string }[] };
              }
            | { status: 404; body: { message: string } }
            | { status: Exclude<HTTPStatusCode, 200 | 404>; body: unknown };
        };
      }
    >
  >;

  type ServerInferResponseBodyTest = Expect<
    Equal<
      ServerInferResponseBody<typeof contract.getPost, 200>,
      { title?: string | undefined; id: number; content: string }
    >
  >;

  type ClientInferResponseBodyTest = Expect<
    Equal<
      ClientInferResponseBody<typeof contract.getPost, 200>,
      { title: string; id: number; content: string }
    >
  >;

  type ServerInferRequestTest = Expect<
    Equal<
      ServerInferRequest<typeof contract>,
      {
        getPost: {
          query: { includeComments: boolean };
          params: { id: number };
          headers: { authorization: string };
        };
        createPost: {
          body: { title: string; content: string };
          headers: { authorization: string };
        };
        uploadImage: {
          // eslint-disable-next-line @typescript-eslint/ban-types
          body: {};
          headers: { authorization: string };
        };
        nested: {
          getComments: {
            params: { id: number };
            headers: { authorization: string; 'pagination-page': number };
          };
        };
      }
    >
  >;

  type ClientInferRequestTest = Expect<
    Equal<
      ClientInferRequest<typeof contract>,
      {
        getPost: {
          query: { includeComments?: boolean | undefined };
          params: { id: string };
          headers: { authorization: string };
        };
        createPost: {
          body: { title: string; content: string };
          headers: { authorization: string };
        };
        uploadImage: {
          body:
            | {
                image: File;
              }
            | FormData;
          headers: { authorization: string };
        };
        nested: {
          getComments: {
            params: { id: string };
            headers: { authorization: string; 'pagination-page': string };
          };
        };
      }
    >
  >;
});
