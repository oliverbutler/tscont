import { initServer } from '@ts-rest/koa';
import { apiBlog } from '@ts-rest/example-contracts';
import { mockPostFixtureFactory } from './main';

const s = initServer();
export const getPost = s.route(apiBlog.getPost, async ({ params: { id } }) => {
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
});
