import { app } from '@azure/functions';
import { Post, apiBlog } from '@ts-rest/example-contracts';
import { createAzureFunctionHandler, tsr } from '@ts-rest/serverless/azure';

const mockPostFixtureFactory = (partial: Partial<Post>): Post => ({
  id: 'mock-id',
  title: `Post`,
  content: `Content`,
  description: `Description`,
  published: true,
  tags: ['tag1', 'tag2'],
  ...partial,
});

const router = tsr.router(apiBlog, {
  getPost: async ({ params: { id } }, { azureContext }) => {
    azureContext.log('Received getPost request');

    const post = mockPostFixtureFactory({ id });

    if (!post) {
      return {
        status: 404,
        body: null,
      };
    }

    return {
      status: 200,
      body: post,
    };
  },
  getPosts: async ({ query }) => {
    const posts = [
      mockPostFixtureFactory({ id: '1' }),
      mockPostFixtureFactory({ id: '2' }),
    ];

    return {
      status: 200,
      body: {
        posts,
        count: 0,
        skip: query.skip,
        take: query.take,
      },
    };
  },
  createPost: async ({ body }) => {
    const post = mockPostFixtureFactory(body);

    return {
      status: 201,
      body: post,
    };
  },
  updatePost: async ({ body }) => {
    const post = mockPostFixtureFactory(body);

    return {
      status: 200,
      body: post,
    };
  },
  deletePost: async ({ params: { id } }) => {
    return {
      status: 200,
      body: { message: `Post ${id} deleted` },
    };
  },
  testPathParams: async ({ params }) => {
    return {
      status: 200,
      body: {
        ...params,
        shouldDelete: 'foo',
      },
    };
  },
});

const handler = createAzureFunctionHandler(apiBlog, router, {
  jsonQuery: true,
  responseValidation: true,
  errorHandler: (err, req, { azureContext }) => {
    if (err instanceof Error) {
      azureContext.error(`[${err.name}] ${err.message}`);
    }
  },
});

app.http('apiBlog', {
  methods: ['POST', 'PATCH', 'DELETE', 'GET'],
  authLevel: 'anonymous',
  route: '{*route}',
  handler,
});
