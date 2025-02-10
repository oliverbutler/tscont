import { describe, it, expect } from 'bun:test';
import { app } from './index';
import request from 'supertest';

const expectRes = (res: any) => {
  return expect({ body: res.body, status: res.status });
};

describe('express 5', () => {
  it('should be able to get', async () => {
    const res = await request(app).get('/pokemon/1');

    expectRes(res).toStrictEqual({
      status: 200,
      body: {
        id: 1,
        name: 'Charizard',
      },
    });
  });

  it('should do param validation', async () => {
    const res = await request(app).get('/pokemon/foo');

    expectRes(res).toStrictEqual({
      status: 400,
      body: {
        issues: [
          {
            code: 'invalid_type',
            expected: 'number',
            message: 'Expected number, received nan',
            path: ['id'],
            received: 'nan',
          },
        ],
        name: 'ZodError',
      },
    });
  });

  it('delete with no body and no return body', async () => {
    const res = await request(app).delete('/pokemon/1');

    expectRes(res).toStrictEqual({
      status: 200,
      body: {},
    });
  });

  it('update', async () => {
    const res = await request(app)
      .patch('/pokemon/1')
      .send({ name: 'pikachu' });

    expectRes(res).toStrictEqual({
      status: 200,
      body: {
        message: 'updated 1 to pikachu',
      },
    });
  });

  it('should handle tiered optional query params', async () => {
    const res = await request(app).get('/posts');

    expectRes(res).toStrictEqual({
      status: 200,
      body: [],
    });
  });
});
