import * as fs from 'node:fs';
import * as path from 'node:path';

import { bodyParser } from '@koa/bodyparser';
import * as multer from '@koa/multer';
import * as Router from '@koa/router';
import {
  initContract,
  ResponseValidationError,
  TsRestResponseError,
} from '@ts-rest/core';
import * as supertest from 'supertest';
import * as Koa from 'koa';
import { z } from 'zod';

import { createKoaEndpoints, initServer } from './ts-rest-koa';
import { CombinedRequestValidationErrorSchema } from './request-validation-error';

const upload = multer();

const c = initContract();
const s = initServer();

const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    responses: {
      200: null,
    },
  },
});

describe('strict mode', () => {
  it('allows unknown responses when not in strict mode', () => {
    const cLoose = c.router({ posts: postsRouter });

    s.router(cLoose, {
      posts: {
        getPost: async ({ params: { id } }) => {
          return {
            status: 201,
            body: null,
          };
        },
      },
    });
  });

  it('does not allow unknown statuses when in strict mode', () => {
    const cStrict = c.router(
      { posts: postsRouter },
      { strictStatusCodes: true },
    );

    s.router(cStrict, {
      posts: {
        // @ts-expect-error 201 is not defined as a known response
        getPost: async ({ params: { id } }) => {
          return {
            status: 201,
            body: null,
          };
        },
      },
    });
  });
});

describe('ts-rest-koa', () => {
  it('should handle non-json response types from contract', async () => {
    const contract = c.router({
      postIndex: {
        method: 'POST',
        path: '/index.html',
        body: z.object({
          echoHtml: z.string(),
        }),
        responses: {
          200: c.otherResponse({
            contentType: 'text/html',
            body: z.string().regex(/^<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>$/im),
          }),
        },
      },
      getRobots: {
        method: 'GET',
        path: `/robots.txt`,
        responses: {
          200: c.otherResponse({
            contentType: 'text/plain',
            body: c.type<string>(),
          }),
        },
      },
      getCss: {
        method: 'GET',
        path: '/style.css',
        responses: {
          200: c.otherResponse({
            contentType: 'text/css',
            body: c.type<string>(),
          }),
        },
      },
    });

    const postIndex = s.route(
      contract.postIndex,
      async ({ body: { echoHtml } }) => {
        return {
          status: 200,
          body: echoHtml,
        };
      },
    );

    const router = s.router(contract, {
      postIndex,
      getRobots: async () => {
        return {
          status: 200,
          body: 'User-agent: * Disallow: /',
        };
      },
      getCss: async () => {
        return {
          status: 200,
          body: 'body { color: red; }',
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();

    createKoaEndpoints(contract, router, app, koaRouter, {
      responseValidation: true,
    });

    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        if (err instanceof ResponseValidationError) {
          ctx.status = 500;
          ctx.body = 'Response validation failed';
          return;
        }
      }
    });

    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    const responseHtml = await supertest(server)
      .post('/index.html')
      .send({ echoHtml: '<h1>hello world</h1>' });
    expect(responseHtml.status).toEqual(200);
    expect(responseHtml.text).toEqual('<h1>hello world</h1>');
    expect(responseHtml.header['content-type']).toEqual('text/html');

    const responseHtmlFail = await supertest(server)
      .post('/index.html')
      .send({ echoHtml: 'hello world' });
    expect(responseHtmlFail.status).toEqual(500);
    expect(responseHtmlFail.text).toEqual('Response validation failed');
    expect(responseHtmlFail.header['content-type']).toEqual(
      'text/plain; charset=utf-8',
    );

    const responseTextPlain = await supertest(server).get('/robots.txt');
    expect(responseTextPlain.status).toEqual(200);
    expect(responseTextPlain.text).toEqual('User-agent: * Disallow: /');
    expect(responseTextPlain.header['content-type']).toEqual('text/plain');

    const responseCss = await supertest(server).get('/style.css');
    expect(responseCss.status).toEqual(200);
    expect(responseCss.text).toEqual('body { color: red; }');
    expect(responseCss.header['content-type']).toEqual('text/css');
  });

  it('should handle no content body', async () => {
    const contract = c.router({
      noContent: {
        method: 'POST',
        path: '/:status',
        pathParams: z.object({
          status: z.coerce
            .number()
            .pipe(z.union([z.literal(200), z.literal(204)])),
        }),
        body: c.noBody(),
        responses: {
          200: c.noBody(),
          204: c.noBody(),
        },
      },
    });

    const router = s.router(contract, {
      noContent: async ({ params }) => {
        return {
          status: params.status,
          body: undefined,
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();
    createKoaEndpoints(contract, router, app, koaRouter);
    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .post('/200')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.text).toEqual('');
        expect(res.header['content-type']).toBeUndefined();
        expect(res.header['content-length']).toBeUndefined();
      });

    await supertest(server)
      .post('/204')
      .expect((res) => {
        expect(res.status).toEqual(204);
        expect(res.text).toEqual('');
        expect(res.header['content-type']).toBeUndefined();
        expect(res.header['content-length']).toBeUndefined();
      });
  });

  it('should handle optional url params', async () => {
    const contract = c.router({
      getPosts: {
        method: 'GET',
        path: '/posts/:id?',
        pathParams: z.object({
          id: z.string().optional(),
        }),
        responses: {
          200: z.object({
            id: z.string().optional(),
          }),
        },
      },
    });

    const router = s.router(contract, {
      getPosts: async ({ params }) => {
        return {
          status: 200,
          body: {
            id: params.id,
          },
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();
    createKoaEndpoints(contract, router, app, koaRouter);
    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .get('/posts')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({});
      });

    await supertest(server)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '10' });
      });
  });

  it('should handle multipart/form-data', async () => {
    const contract = c.router(
      {
        uploadFiles: {
          method: 'POST',
          path: '/upload',
          body: c.type<{
            files: File[];
            file: File;
            foo: string;
          }>(),
          responses: {
            200: c.type<{
              fileFields: string[];
              body: {
                foo: string;
              };
            }>(),
          },
          contentType: 'multipart/form-data',
        },
      },
      { strictStatusCodes: true },
    );

    const router = s.router(contract, {
      uploadFiles: {
        middleware: [upload.any()],
        handler: async ({
          ctx: {
            files,
            request: { body },
          },
        }) => {
          const filesArray = files as multer.File[];

          return {
            status: 200,
            body: {
              fileFields: filesArray.map((file) => file.fieldname),
              body,
            },
          };
        },
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();
    createKoaEndpoints(contract, router, app, koaRouter);
    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .post('/upload')
      .attach('files', Buffer.from(''), {
        filename: 'filename-1',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from(''), {
        filename: 'filename-2',
        contentType: 'text/plain',
      })
      .attach('file', Buffer.from(''), {
        filename: 'filename-3',
        contentType: 'text/plain',
      })
      .field('foo', 'bar')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({
          fileFields: ['files', 'files', 'file'],
          body: {
            foo: 'bar',
          },
        });
      });
  });

  it('allows download image', async () => {
    const contract = c.router({
      getFile: {
        method: 'GET',
        path: `/image`,
        headers: z.object({
          'Content-Type': z.string().optional(),
          'Content-disposition': z.string().optional(),
        }),
        responses: {
          200: z.unknown(),
        },
        summary: 'Get an image',
      },
    });

    const originalFilePath = path.join(__dirname, 'assets/logo.png');

    const router = s.router(contract, {
      getFile: async ({ ctx }) => {
        ctx.set('Content-type', 'image/png');

        return {
          status: 200,
          body: fs.createReadStream(originalFilePath),
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();

    createKoaEndpoints(contract, router, app, koaRouter, {
      responseValidation: true,
    });

    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    app.use((ctx, next) => {
      const err = ctx.state['err'];

      if (err instanceof ResponseValidationError) {
        ctx.status = 500;
        ctx.body = 'Response validation failed';
        return;
      }

      next();
    });

    const server = app.listen();

    const responseImage = await supertest(server).get('/image');
    expect(responseImage.status).toEqual(200);
    expect(responseImage.body.toString()).toEqual(
      fs.readFileSync(originalFilePath, { encoding: 'utf-8' }),
    );
    expect(responseImage.headers['content-type']).toEqual('image/png');
  });

  it('should handle thrown TsRestResponseError', async () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.string(),
          }),
          404: z.object({
            message: z.literal('Not found'),
          }),
          500: c.noBody(),
        },
      },
    });

    const router = s.router(contract, {
      getPost: async ({ params: { id } }) => {
        if (id === '500') {
          throw new TsRestResponseError(contract.getPost, {
            status: 500,
            body: undefined,
          });
        }

        throw new TsRestResponseError(contract.getPost, {
          status: 404,
          body: {
            message: 'Not found',
          },
        });
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();
    createKoaEndpoints(contract, router, app, koaRouter);
    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .get('/posts/500')
      .expect((res) => {
        expect(res.status).toEqual(500);
        expect(res.text).toEqual('');
      });

    await supertest(server)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(404);
        expect(res.body).toEqual({ message: 'Not found' });
      });
  });

  it("should throw combined requestValidation error if body doesn't match", async () => {
    const contract = c.router({
      createPost: {
        method: 'POST',
        path: '/posts',
        body: z.object({
          id: z.string(),
          content: z.string(),
        }),
        responses: {
          200: c.noBody(),
          400: CombinedRequestValidationErrorSchema,
        },
      },
    });

    const router = s.router(contract, {
      createPost: async () => {
        return {
          status: 200,
          body: undefined,
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();

    createKoaEndpoints(contract, router, app, koaRouter, {
      requestValidationErrorHandler: 'combined',
    });

    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(400);
        expect(() =>
          CombinedRequestValidationErrorSchema.parse(res.body),
        ).not.toThrowError();
      });
  });

  it('should throw a response validation error if body has extra properties', async () => {
    const contract = c.router({
      createPost: {
        method: 'POST',
        path: '/posts',
        body: c.noBody(),
        responses: {
          200: z.strictObject({ foo: z.string() }),
          400: CombinedRequestValidationErrorSchema,
        },
      },
    });

    const router = s.router(contract, {
      createPost: async () => {
        return {
          status: 200,
          body: { foo: 'bar', baz: 'qux' },
        };
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();

    createKoaEndpoints(contract, router, app, koaRouter, {
      responseValidation: true,
    });

    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(500);
      });
  });

  it('should handle custom state and ctx', async () => {
    const contract = c.router({
      test: {
        method: 'POST',
        path: '/',
        body: c.noBody(),
        responses: {
          200: z.object({ foo: z.number() }),
          500: z.object({ bar: z.boolean() }),
        },
      },
    });

    type State = { foo: number };
    type Ctx = { bar: boolean };

    const router = s.router<typeof contract, State, Ctx>(contract, {
      test: {
        middleware: [
          (ctx, next) => {
            expect(ctx.bar).toBe(true);
            expect(ctx.state.foo).toBe(5);
            next();
          },
        ],
        handler: async ({ ctx }) => {
          if (ctx.bar) {
            return {
              status: 500,
              body: { bar: ctx.bar },
            };
          }

          return {
            status: 200,
            body: { foo: ctx.state.foo },
          };
        },
      },
    });

    const app = new Koa();
    app.use(bodyParser());

    const koaRouter = new Router();

    app.use((ctx: Koa.ParameterizedContext<State, Ctx>, next) => {
      ctx.bar = true;
      ctx.state.foo = 5;
      return next();
    });

    createKoaEndpoints(contract, router, app, koaRouter);
    app.use(koaRouter.routes()).use(koaRouter.allowedMethods());

    const server = app.listen();

    await supertest(server)
      .post('/')
      .expect((res) => {
        expect(res.status).toEqual(500);
        expect(res.body).toStrictEqual({ bar: true });
      });
  });
});
