import * as Koa from 'koa';
import * as Router from '@koa/router';
import { initServer, createKoaEndpoints } from '@ts-rest/koa';
import { apiBlog, Post } from '@ts-rest/example-contracts';
import { getPost } from './get-post';

export const mockPostFixtureFactory = (partial: Partial<Post>): Post => ({
  id: 'mock-id',
  title: `Post`,
  content: `Content`,
  description: `Description`,
  published: true,
  tags: ['tag1', 'tag2'],
  ...partial,
});

const app = new Koa();
const koaRouter = new Router();

koaRouter.get('/', async (ctx) => {
  ctx.body = { hello: 'world' };
});

const s = initServer();

const router = s.router(apiBlog, {
  getPost,
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
  deletePost: async () => {
    return {
      status: 200,
      body: { message: 'Post deleted' },
    };
  },
  testPathParams: async ({ params }) => {
    return {
      status: 200,
      body: params,
    };
  },
});

createKoaEndpoints(apiBlog, router, app, koaRouter, {
  logInitialization: true,
});

app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
