import * as supertest from 'supertest';
import app, {
  SAMPLE_OWNER_JWT,
  SAMPLE_GUEST_JWT,
  SAMPLE_NON_OWNER_JWT,
} from '../authenticated-app';

const superTestApp = supertest(app);

describe('Authenticated App Endpoints', () => {
  it('GET /posts should fail with invalid JWT', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', 'invalid jwt')
      .set('x-pagination', '5');

    expect(res.status).toStrictEqual(401);
  });

  it('GET /posts should work with guest', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', SAMPLE_GUEST_JWT)
      .set('x-pagination', '5');

    expect(res.status).toStrictEqual(200);
  });

  it('GET /posts should work with user', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', SAMPLE_NON_OWNER_JWT)
      .set('x-pagination', '5');

    expect(res.status).toStrictEqual(200);
  });

  it('POST /posts should fail with guest', async () => {
    const res = await superTestApp
      .post('/posts')
      .set('x-api-key', SAMPLE_GUEST_JWT)
      .send({
        title: 'Title',
        content: 'content',
      });

    expect(res.status).toStrictEqual(401);
  });

  it('POST /posts should succeed with user', async () => {
    const res = await superTestApp
      .post('/posts')
      .set('x-api-key', SAMPLE_NON_OWNER_JWT)
      .send({
        title: 'Title',
        content: 'content',
      });

    expect(res.status).toStrictEqual(201);
  });

  it('PATCH /posts/:id should succeed with owner user', async () => {
    const res = await superTestApp
      .patch('/posts/1')
      .set('x-api-key', SAMPLE_OWNER_JWT)
      .send({
        title: 'Title',
        content: 'content',
      });

    expect(res.status).toStrictEqual(200);
  });

  it('PATCH /posts/:id should fail with non-owner user', async () => {
    const res = await superTestApp
      .patch('/posts/1')
      .set('x-api-key', SAMPLE_NON_OWNER_JWT)
      .send({
        title: 'Title',
        content: 'content',
      });

    expect(res.status).toStrictEqual(403);
    expect(res.body).toStrictEqual({
      message: 'Forbidden... You are not the owner of this resource',
    });
  });

  it('DELETE /posts/:id should succeed and receive header from middleware', async () => {
    const res = await superTestApp
      .delete('/posts/1')
      .set('x-api-key', SAMPLE_OWNER_JWT);

    expect(res.status).toStrictEqual(200);
    expect(res.headers['x-middleware']).toStrictEqual('true');
  });

  it('should error on invalid pagination header', async () => {
    const res = await superTestApp
      .get('/posts?skip=0&take=10')
      .set('x-api-key', SAMPLE_GUEST_JWT)
      .set('x-pagination', 'not a number');

    expect(res.status).toStrictEqual(400);
    expect(res.body).toStrictEqual({
      bodyErrors: null,
      headerErrors: {
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
      },
      pathParameterErrors: null,
      queryParameterErrors: null,
    });
  });
});
