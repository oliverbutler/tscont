import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  initContract,
  ResponseValidationError,
  TsRestResponseError,
} from '@ts-rest/core';
import * as supertest from 'supertest';
import * as express from 'express';
import { z } from 'zod';
import { createExpressEndpoints, initServer } from './ts-rest-express';
import * as multer from 'multer';
import {
  CombinedRequestValidationErrorSchema,
  DefaultRequestValidationErrorSchema,
} from './request-validation-error';

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

describe('ts-rest-express', () => {
  it('should handle non-json response types from contract', async () => {
    const contract = c.router({
      postIndex: {
        method: 'POST',
        path: `/index.html`,
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

    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    createExpressEndpoints(contract, router, app, {
      responseValidation: true,
    });

    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (err instanceof ResponseValidationError) {
          res.status(500).send('Response validation failed');
          return;
        }

        next(err);
      },
    );

    const responseHtml = await supertest(app)
      .post('/index.html')
      .send({ echoHtml: '<h1>hello world</h1>' });
    expect(responseHtml.status).toEqual(200);
    expect(responseHtml.text).toEqual('<h1>hello world</h1>');
    expect(responseHtml.header['content-type']).toEqual(
      'text/html; charset=utf-8',
    );

    const responseHtmlFail = await supertest(app)
      .post('/index.html')
      .send({ echoHtml: 'hello world' });
    expect(responseHtmlFail.status).toEqual(500);
    expect(responseHtmlFail.text).toEqual('Response validation failed');
    expect(responseHtmlFail.header['content-type']).toEqual(
      'text/html; charset=utf-8',
    );

    const responseTextPlain = await supertest(app).get('/robots.txt');
    expect(responseTextPlain.status).toEqual(200);
    expect(responseTextPlain.text).toEqual('User-agent: * Disallow: /');
    expect(responseTextPlain.header['content-type']).toEqual(
      'text/plain; charset=utf-8',
    );

    const responseCss = await supertest(app).get('/style.css');
    expect(responseCss.status).toEqual(200);
    expect(responseCss.text).toEqual('body { color: red; }');
    expect(responseCss.header['content-type']).toEqual(
      'text/css; charset=utf-8',
    );
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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .post('/200')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.text).toEqual('');
        expect(res.header['content-type']).toBeUndefined();
        expect(res.header['content-length']).toStrictEqual('0');
      });

    await supertest(app)
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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({});
      });

    await supertest(app)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '10' });
      });
  });

  it('should handle two levels of optional url params', async () => {
    const contract = c.router({
      getPosts: {
        method: 'GET',
        path: '/posts/:year?/:month?',
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
            id: `${params.year}-${params.month}`,
          },
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({
          id: `undefined-undefined`,
        });
      });

    await supertest(app)
      .get('/posts/2025')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '2025-undefined' });
      });

    await supertest(app)
      .get('/posts/2025/01')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '2025-01' });
      });
  });

  it('should handle multipart/form-data', async () => {
    const contract = c.router({
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
    });

    const router = s.router(contract, {
      uploadFiles: {
        middleware: [upload.any()],
        handler: async ({ files, body }) => {
          const filesArray = files as Express.Multer.File[];

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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
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
      getFile: async ({ res }) => {
        res.setHeader('Content-type', 'image/png');

        return {
          status: 200,
          body: fs.createReadStream(originalFilePath),
        };
      },
    });

    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    createExpressEndpoints(contract, router, app, {
      responseValidation: true,
    });

    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (err instanceof ResponseValidationError) {
          res.status(500).send('Response validation failed');
          return;
        }

        next(err);
      },
    );

    const responseImage = await supertest(app).get('/image');
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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts/500')
      .expect((res) => {
        expect(res.status).toEqual(500);
        expect(res.text).toEqual('');
      });

    await supertest(app)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(404);
        expect(res.body).toEqual({ message: 'Not found' });
      });
  });

  it("should throw default requestValidation error if body doesn't match", async () => {
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
          400: DefaultRequestValidationErrorSchema,
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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app, {
      requestValidationErrorHandler: 'default',
    });

    await supertest(app)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(400);
        expect(() =>
          DefaultRequestValidationErrorSchema.parse(res.body),
        ).not.toThrowError();
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
          400: DefaultRequestValidationErrorSchema,
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

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app, {
      requestValidationErrorHandler: 'combined',
    });

    await supertest(app)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(400);
        expect(() =>
          CombinedRequestValidationErrorSchema.parse(res.body),
        ).not.toThrowError();
      });
  });
});
