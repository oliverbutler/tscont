import * as supertest from 'supertest';
import app from '../main';

const superTestApp = supertest(app);

describe('Posts Endpoints', () => {
  it('GET /posts should return an array of posts', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', 'foo')
      .set('x-pagination', '5');

    expect(res.status).toStrictEqual(200);
  });

  it('should transform skip and take into numbers', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', 'foo');

    expect(res.status).toStrictEqual(200);
    expect(res.body.skip).toStrictEqual(0);
    expect(res.body.take).toStrictEqual(10);
  });

  it('should error on invalid pagination header', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', 'foo')
      .set('x-pagination', 'not a number');

    expect(res.status).toStrictEqual(400);
    expect(res.body).toStrictEqual({
      name: 'ValidationError',
      issues: [
        {
          code: 'invalid_type',
          expected: 'number',
          message: 'Expected number, received nan',
          path: ['x-pagination'],
          received: 'nan',
        },
      ],
    });
  });

  it('should error if a required query param is missing', async () => {
    const res = await superTestApp.get('/posts?skip=0').set('x-api-key', 'foo');

    expect(res.status).toStrictEqual(400);
    expect(res.body).toStrictEqual({
      name: 'ValidationError',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Required',
          path: ['take'],
          received: 'undefined',
        },
      ],
    });
  });

  it('should error if body is incorrect', async () => {
    const res = await superTestApp.post('/posts').set('x-api-key', 'foo').send({
      title: 'Good title',
      content: 123,
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body).toStrictEqual({
      name: 'ValidationError',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Expected string, received number',
          path: ['content'],
          received: 'number',
        },
      ],
    });
  });

  it('should error if api key header is missing', async () => {
    const res = await superTestApp.get('/posts');

    expect(res.status).toStrictEqual(400);
    expect(res.body).toStrictEqual({
      name: 'ValidationError',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          message: 'Required',
          path: ['x-api-key'],
          received: 'undefined',
        },
      ],
    });
  });

  it('should transform body correctly', async () => {
    const res = await superTestApp.post('/posts').set('x-api-key', 'foo').send({
      title: 'Title with extra spaces     ',
      content: 'content',
    });

    expect(res.status).toStrictEqual(201);
    expect(res.body.title).toStrictEqual('Title with extra spaces');
  });

  it('should format params using pathParams correctly', async () => {
    const res = await superTestApp
      .get('/test/123/name')
      .set('x-api-key', 'foo');

    expect(res.status).toStrictEqual(200);
    expect(res.body).toStrictEqual({
      id: 123,
      name: 'name',
    });
  });
});
