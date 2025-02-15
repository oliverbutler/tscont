import { initContract } from '@ts-rest/core';
import {
  RequestValidationErrorSchema,
  TsRestException,
  tsRestHandler,
  TsRestHandler,
} from './ts-rest-nest-handler';
import { z } from 'zod';
import {
  ArgumentsHost,
  Body,
  CallHandler,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Get,
  Headers,
  HttpException,
  Injectable,
  NestInterceptor,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';
import { TsRest } from './ts-rest.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { TsRestModule } from './ts-rest.module';
import path = require('path');

export type Equal<a, b> = (<T>() => T extends a ? 1 : 2) extends <
  T,
>() => T extends b ? 1 : 2
  ? true
  : false;

export type Expect<a extends true> = a;

jest.setTimeout(10000);

describe('ts-rest-nest-handler', () => {
  describe('multi-handler api', () => {
    it('should be able to implement a whole contract', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler() {
          return tsRestHandler(contract, {
            getRequest: async () => ({
              status: 200,
              body: { message: 'hello' },
            }),
            postRequest: async ({ body }) => ({
              status: 200,
              body: { message: body.message },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const responseGet = await supertest(app.getHttpServer())
        .get('/test')
        .send();

      expect(responseGet.status).toBe(200);
      expect(responseGet.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(responsePost.status).toBe(200);
      expect(responsePost.body).toEqual({ message: 'hello' });
    });

    describe('body validation', () => {
      it('should validate body', async () => {
        const c = initContract();

        const contract = c.router({
          postRequest: {
            path: '/test',
            method: 'POST',
            body: z.object({
              message: z.string(),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              postRequest: async ({ body }) => ({
                status: 200,
                body: body,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 'hello' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'hello' });

        const responsePost = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 123 });

        expect(responsePost.status).toBe(400);
        expect(responsePost.body).toEqual({
          bodyResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'number',
                path: ['message'],
                message: 'Expected string, received number',
              },
            ],
          },
          headersResult: null,
          queryResult: null,
          paramsResult: null,
        });
        expect(() =>
          RequestValidationErrorSchema.parse(responsePost.body),
        ).not.toThrowError();
      });

      it("shouldn't validate body", async () => {
        const c = initContract();

        const contract = c.router({
          postRequest: {
            path: '/test',
            method: 'POST',
            body: z.object({
              message: z.string(),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, {
            validateRequestBody: false,
          })
          async postRequest() {
            return tsRestHandler(contract, {
              postRequest: async ({ body }) => ({
                status: 200,
                body: body,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 'hello' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'hello' });

        const responsePost = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 123 });

        expect({
          status: responsePost.status,
          body: responsePost.body,
        }).toStrictEqual({
          status: 200,
          body: { message: 123 },
        });
      });
    });

    describe('validate headers', () => {
      it('should validate', async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
            headers: z.object({
              some: z.string(),
            }),
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer()).get('/').send();

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          headersResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                message: 'Required',
                path: ['some'],
                received: 'undefined',
              },
            ],
          },
          bodyResult: null,
          queryResult: null,
          paramsResult: null,
        });
      });

      it("shouldn't validate", async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
            headers: z.object({
              some: z.string(),
            }),
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, { validateRequestHeaders: false })
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer()).get('/').send();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'ok',
        });
      });
    });

    describe('validate query', () => {
      it('should validate', async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            query: z.object({
              ids: z.array(z.string()),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .get('/?id=some-id')
          .send();

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          headersResult: null,
          bodyResult: null,
          queryResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'array',
                message: 'Required',
                path: ['ids'],
                received: 'undefined',
              },
            ],
          },
          paramsResult: null,
        });
      });

      it("shouldn't validate", async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            query: z.object({
              ids: z.array(z.string()),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, { validateRequestQuery: false })
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .get('/?id=some-id')
          .send();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'ok' });
      });
    });

    it('should be able to intercept with multi handler', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Injectable()
      class TestInterceptor implements NestInterceptor {
        intercept(
          context: ExecutionContext,
          next: CallHandler,
        ): Observable<any> {
          return next.handle().pipe(
            map((data) => ({
              message: 'intercepted',
              oldMessage: data.message,
            })),
          );
        }
      }

      @Controller()
      class MultiHandlerTestController {
        @TsRestHandler(contract)
        @UseInterceptors(TestInterceptor)
        async postRequest() {
          return tsRestHandler(contract, {
            getRequest: async () => ({
              status: 200,
              body: { message: 'ok' },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [MultiHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'intercepted',
        oldMessage: 'ok',
      });
    });

    it('should be able to utilise nest parameter decorators', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler(@Headers('x-api-key') apiKey: string | undefined) {
          return tsRestHandler(contract, {
            getRequest: async () => ({
              status: 200,
              body: { message: apiKey || 'no header' },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/test')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ message: 'no header' });
        });

      await supertest(app.getHttpServer())
        .get('/test')
        .set('x-api-key', 'foo')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ message: 'foo' });
        });
    });

    it('should be able to have logic outside the return tsRestHandler', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              number: z.number(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler(@Query('number') numberQuery: string) {
          const number = parseInt(numberQuery);

          return tsRestHandler(contract, {
            getRequest: async () => ({
              status: 200,
              body: { number },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/test?number=123')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ number: 123 });
        });
    });

    it('should be able to do custom nest things like a redirect', async () => {
      const c = initContract();

      const contract = c.router({
        getRedirect: {
          path: '/redirect',
          method: 'GET',
          responses: {
            302: c.noBody(),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler(@Res() res: any) {
          return tsRestHandler(contract, {
            getRedirect: async () => {
              res.status(302).redirect('/redirected');

              return {
                status: 302,
                body: undefined,
              };
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/redirect')
        .send()
        .expect(302)
        .expect((res) => {
          expect(res.header.location).toBe('/redirected');
        });
    });

    it('should be able to upload files and other multipart/form-data', async () => {
      const c = initContract();

      const contract = c.router({
        multi: {
          method: 'POST',
          path: '/multi',
          body: z.object({
            messageAsField: z.string(),
            file: z.custom<File>((v) => true),
          }),
          contentType: 'multipart/form-data',
          responses: {
            200: z.object({
              messageAsField: z.string(),
              fileSize: z.number(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract)
        @UseInterceptors(FileInterceptor('file'))
        async postRequest(@UploadedFile() file: File) {
          return tsRestHandler(contract, {
            multi: async (args) => {
              return {
                status: 200,
                body: {
                  messageAsField: args.body.messageAsField,
                  fileSize: file.size,
                },
              };
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .post('/multi')
        .field('messageAsField', 'hello from ts-rest')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: response.status,
        body: response.body,
      }).toEqual({
        status: 200,
        body: {
          messageAsField: 'hello from ts-rest',
          fileSize: 11338,
        },
      });

      const errorsForBadField = await supertest(app.getHttpServer())
        .post('/multi')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: errorsForBadField.status,
        body: errorsForBadField.body,
      }).toEqual({
        status: 400,
        body: {
          bodyResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',

                path: ['messageAsField'],
                message: 'Required',
              },
            ],
          },
          headersResult: null,
          paramsResult: null,
          queryResult: null,
        },
      });
    });

    it('should route correctly for optional params', async () => {
      const c = initContract();

      const contract = c.router({
        getPosts: {
          path: '/posts/:year?/:month?',
          method: 'GET',
          responses: {
            200: z.object({
              rangeSearched: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler() {
          return tsRestHandler(contract, {
            getPosts: async ({ params }) => ({
              status: 200,
              body: { rangeSearched: `${params.year}-${params.month}` },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/posts')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'undefined-undefined',
          }),
        );

      await supertest(app.getHttpServer())
        .get('/posts/yyyy')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'yyyy-undefined',
          }),
        );

      await supertest(app.getHttpServer())
        .get('/posts/yyyy/mm')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'yyyy-mm',
          }),
        );
    });
  });

  describe('single-handler api', () => {
    it('should be able to implement a single `AppRoute`', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.getRequest)
        async getRequest() {
          return tsRestHandler(contract.getRequest, async () => ({
            status: 200,
            body: { message: 'hello' },
          }));
        }

        @TsRestHandler(contract.postRequest)
        async postRequest() {
          return tsRestHandler(contract.postRequest, async () => ({
            status: 200,
            body: { message: 'hello' },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(responsePost.status).toBe(200);
      expect(responsePost.body).toEqual({ message: 'hello' });
    });

    it('should validate body', async () => {
      const c = initContract();

      const contract = c.router({
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.postRequest)
        async postRequest() {
          return tsRestHandler(contract.postRequest, async ({ body }) => ({
            status: 200,
            body: body,
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 123 });

      expect(responsePost.status).toBe(400);
      expect(responsePost.body).toEqual({
        bodyResult: {
          name: 'ValidationError',
          issues: [
            {
              code: 'invalid_type',
              expected: 'string',
              received: 'number',
              path: ['message'],
              message: 'Expected string, received number',
            },
          ],
        },
        headersResult: null,
        queryResult: null,
        paramsResult: null,
      });
    });

    it('should be able to enable response validation on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.test, {
          validateResponses: true,
        })
        async postRequest() {
          return tsRestHandler(contract.test, async () => ({
            status: 200,
            // Bad response as we lied to TS :(
            body: { message: 123123 as unknown as string },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(500);
    });

    it('should be able to upload files and other multipart/form-data', async () => {
      const c = initContract();

      const contract = c.router({
        multi: {
          method: 'POST',
          path: '/multi',
          body: z.object({
            messageAsField: z.string(),
            file: z.custom<File>((v) => true),
          }),
          contentType: 'multipart/form-data',
          responses: {
            200: z.object({
              messageAsField: z.string(),
              fileSize: z.number(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @Post('/nest-multi')
        @UseInterceptors(FileInterceptor('file'))
        nestMulti(
          @Body() body: { messageAsField: string },
          @UploadedFile() file: File,
        ) {
          return {
            messageAsField: body.messageAsField,
            fileSize: file.size,
          };
        }

        @TsRestHandler(contract.multi)
        @UseInterceptors(FileInterceptor('file'))
        async postRequest(@UploadedFile() file: File) {
          return tsRestHandler(contract.multi, async (args) => {
            return {
              status: 200,
              body: {
                messageAsField: args.body.messageAsField,
                fileSize: file.size,
              },
            };
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const responseNested = await supertest(app.getHttpServer())
        .post('/nest-multi')
        .field('messageAsField', 'hello from nest')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: responseNested.status,
        body: responseNested.body,
      }).toEqual({
        status: 201,
        body: {
          messageAsField: 'hello from nest',
          fileSize: 11338,
        },
      });

      const response = await supertest(app.getHttpServer())
        .post('/multi')
        .field('messageAsField', 'hello from ts-rest')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: response.status,
        body: response.body,
      }).toEqual({
        status: 200,
        body: {
          messageAsField: 'hello from ts-rest',
          fileSize: 11338,
        },
      });

      const errorsForBadField = await supertest(app.getHttpServer())
        .post('/multi')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: errorsForBadField.status,
        body: errorsForBadField.body,
      }).toEqual({
        status: 400,
        body: {
          bodyResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',

                path: ['messageAsField'],
                message: 'Required',
              },
            ],
          },
          headersResult: null,
          paramsResult: null,
          queryResult: null,
        },
      });
    });

    it('should remove extra body keys with response validation enabled on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/returns-too-much',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
              nestedObject: z.object({
                nestedString: z.string(),
              }),
            }),
          },
        },
        testArray: {
          path: '/returns-too-much-array',
          method: 'GET',
          responses: {
            200: z.array(
              z.object({
                message: z.string(),
              }),
            ),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, {
          validateResponses: true,
        })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async () => ({
              status: 200,
              body: {
                message: 'valid string',
                extra: 'SHOULD NOT BE IN RESPONSE',
                nestedObject: {
                  nestedString: 'valid string',
                  nestedExtra: 'SHOULD NOT BE IN RESPONSE',
                },
              },
            }),
            testArray: async () => ({
              status: 200,
              body: [
                {
                  message: 'valid string',
                  extra: 'SHOULD NOT BE IN RESPONSE',
                },
              ],
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .get('/returns-too-much')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'valid string',
        nestedObject: { nestedString: 'valid string' },
      });

      const responseArray = await supertest(app.getHttpServer())
        .get('/returns-too-much-array')
        .send();

      expect(responseArray.status).toBe(200);
      expect(responseArray.body).toEqual([
        {
          message: 'valid string',
        },
      ]);
    });

    it("should be able to override the behaviour of the class's response validation", async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      @TsRest({
        validateResponses: true,
      })
      class SingleHandlerTestController {
        @TsRestHandler(contract.test, {
          validateResponses: false,
        })
        async postRequest() {
          return tsRestHandler(contract.test, async () => ({
            status: 200,
            // shouldn't throw an error as we disabled it
            body: { message: 123123 as unknown as string },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 123123 });
    });

    it('should be able to throw a type-safe response', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
            400: z.object({
              myError: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, { validateResponses: true })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async () => {
              throw new TsRestException(contract.test, {
                status: 400,
                body: {
                  myError: 'my error',
                  // @ts-expect-error we want to make sure `validateResponses` is working
                  extraProp: 'should not be in response',
                },
              });
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ myError: 'my error' });
    });

    it('should return a 500 if you throw an invalid response in a handler that has response validation enabled on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router(
        {
          test: {
            path: '/test/:id',
            pathParams: z.object({
              id: z.coerce.number(),
            }),
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
              400: z.object({
                numberOfFuckUps: z.number(),
              }),
            },
          },
        },
        {
          strictStatusCodes: true,
        },
      );

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, { validateResponses: true })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async ({ params }) => {
              const id = params.id;

              if (id === 666) {
                throw new TsRestException(contract.test, {
                  status: 400,
                  body: {
                    // @ts-expect-error intentionally bad response
                    bad_response: 666,
                  },
                });
              }

              return {
                status: 200,
                body: {
                  message: 'All is OK',
                },
              };
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .get('/test/666')
        .send();

      expect(response.status).toBe(500);
    });

    it('types should work well', () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test/:id',
          method: 'POST',
          body: c.body<any>(),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract)
        async postRequest() {
          return tsRestHandler(contract, {
            test: async ({ body }) => {
              type BodyShouldBeAny = Expect<Equal<typeof body, any>>;

              return {
                status: 200,
                body: {
                  message: 'All is OK',
                },
              };
            },
          });
        }
      }
    });

    it('should be able to throw a TsRestException to be handled by an exception filter', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
            400: z.object({
              myError: z.string(),
            }),
          },
        },
      });

      const httpExceptionObserver = jest.fn();

      @Catch()
      class HttpExceptionFilter implements ExceptionFilter {
        catch(exception: unknown, host: ArgumentsHost): void {
          httpExceptionObserver(exception);

          const ctx = host.switchToHttp();

          const response = ctx.getResponse<Response>();

          if (exception instanceof HttpException) {
            response
              .status(exception.getStatus())
              .send(exception.getResponse());
          } else {
            response.status(500).send('something went wrong');
          }
        }
      }

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, { validateResponses: true })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async () => {
              throw new TsRestException(contract.test, {
                status: 400,
                body: {
                  myError: 'my error',
                },
              });
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());

      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ myError: 'my error' });

      // verify exception filter received error from ts-rest handler
      expect(httpExceptionObserver).toHaveBeenCalledTimes(1);
      expect(httpExceptionObserver.mock.calls[0][0]).toMatchObject({
        status: 400,
        response: { myError: 'my error' },
        options: {
          cause: expect.any(TsRestException),
        },
      });
    });

    it('should be able to have custom nest interceptors', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Injectable()
      class TestInterceptor implements NestInterceptor {
        intercept(
          context: ExecutionContext,
          next: CallHandler,
        ): Observable<any> {
          return next.handle().pipe(
            map((data) => ({
              message: 'intercepted',
              oldMessage: data.message,
            })),
          );
        }
      }

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.getRequest)
        @UseInterceptors(TestInterceptor)
        async postRequest() {
          return tsRestHandler(contract.getRequest, async () => ({
            status: 200,
            body: { message: 'ok' },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'intercepted',
        oldMessage: 'ok',
      });
    });

    it('should be able to utilise nest parameter decorators', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract.getRequest)
        async handler(@Headers('x-api-key') apiKey: string | undefined) {
          console.log(apiKey);
          return tsRestHandler(contract.getRequest, async () => ({
            status: 200,
            body: { message: apiKey || 'no header' },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/test')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ message: 'no header' });
        });

      await supertest(app.getHttpServer())
        .get('/test')
        .set('x-api-key', 'foo')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ message: 'foo' });
        });
    });

    it('should be able to do custom nest things like a redirect', async () => {
      const c = initContract();

      const contract = c.router({
        getRedirect: {
          path: '/redirect',
          method: 'GET',
          responses: {
            302: c.noBody(),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract.getRedirect)
        async handler(@Res() res: any) {
          return tsRestHandler(contract.getRedirect, async () => {
            res.status(302).redirect('/redirected');

            return {
              status: 302,
              body: undefined,
            };
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/redirect')
        .send()
        .expect(302)
        .expect((res) => {
          expect(res.header.location).toBe('/redirected');
        });
    });

    it('should route correctly for optional params', async () => {
      const c = initContract();

      const contract = c.router({
        getPosts: {
          path: '/posts/:year?/:month?',
          method: 'GET',
          responses: {
            200: z.object({
              rangeSearched: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract.getPosts)
        async handler() {
          return tsRestHandler(contract.getPosts, async ({ params }) => ({
            status: 200,
            body: { rangeSearched: `${params.year}-${params.month}` },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      await supertest(app.getHttpServer())
        .get('/posts')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'undefined-undefined',
          }),
        );

      await supertest(app.getHttpServer())
        .get('/posts/yyyy')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'yyyy-undefined',
          }),
        );

      await supertest(app.getHttpServer())
        .get('/posts/yyyy/mm')
        .send()
        .expect(200)
        .then((res) =>
          expect(res.body).toStrictEqual({
            rangeSearched: 'yyyy-mm',
          }),
        );
    });
  });

  it('should be able to combine single-handler, multi-handler and vanilla nest controllers', async () => {
    const c = initContract();

    const contract = c.router({
      getRequest: {
        path: '/test',
        method: 'GET',
        responses: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
      postRequest: {
        path: '/test',
        method: 'POST',
        body: z.object({
          message: z.string(),
        }),
        responses: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
    });

    @Controller()
    class MultiTypeHandlerController {
      @TsRestHandler(contract.postRequest)
      async handler2() {
        return tsRestHandler(contract.postRequest, async ({ body }) => ({
          status: 200,
          body: { message: body.message },
        }));
      }

      @Get('/basic-nest-endpoint')
      async basicNestEndpoint() {
        return { message: 'hello' };
      }

      @TsRestHandler({ getRequest: contract.getRequest })
      async handler() {
        return tsRestHandler(
          { getRequest: contract.getRequest },
          {
            getRequest: async () => ({
              status: 200,
              body: { message: 'hello' },
            }),
          },
        );
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [MultiTypeHandlerController],
    }).compile();

    const app = moduleRef.createNestApplication();

    await app.init();

    const response = await supertest(app.getHttpServer()).get('/test').send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello' });

    const responsePost = await supertest(app.getHttpServer())
      .post('/test')
      .send({ message: 'hello' });

    expect(responsePost.status).toBe(200);
    expect(responsePost.body).toEqual({ message: 'hello' });

    const responseBasicNestEndpoint = await supertest(app.getHttpServer())
      .get('/basic-nest-endpoint')
      .send();

    expect(responseBasicNestEndpoint.status).toBe(200);
    expect(responseBasicNestEndpoint.body).toEqual({ message: 'hello' });
  });

  it('should work with fastify', async () => {
    const c = initContract();

    const contract = c.router({
      getPosts: {
        path: '/posts',
        method: 'GET',
        query: z.object({
          limit: z.string(),
        }),
        responses: {
          200: z.array(
            z.object({
              id: z.number(),
            }),
          ),
        },
      },
      getPost: {
        path: '/posts/:id',
        method: 'GET',
        pathParams: z.object({
          id: z.coerce.number(),
        }),
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
      deletePost: {
        path: '/posts/:id',
        method: 'DELETE',
        body: null,
        pathParams: z.object({
          id: z.coerce.number(),
        }),
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
      createPost: {
        path: '/posts',
        method: 'POST',
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
      getHtml: {
        path: '/html',
        method: 'GET',
        responses: {
          200: c.otherResponse({
            contentType: 'text/html',
            body: z.string(),
          }),
        },
      },
    });

    @Controller()
    class FastifyController {
      @TsRestHandler(contract)
      async handler() {
        return tsRestHandler(contract, {
          getPosts: async () => ({
            status: 200,
            body: [{ id: 1 }, { id: 2 }],
          }),
          getPost: async ({ params }) => ({
            status: 200,
            body: {
              id: params.id,
            },
          }),
          deletePost: async ({ params }) => ({
            status: 200,
            body: {
              id: params.id,
            },
          }),
          createPost: async ({ body }) => ({
            status: 201,
            body: {
              id: 1,
              title: body.title,
              content: body.content,
            },
          }),
          getHtml: async () => ({
            status: 200,
            body: '<h1>hello world</h1>',
          }),
        });
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [FastifyController],
    }).compile();

    const app = moduleRef.createNestApplication(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await supertest(app.getHttpServer())
      .get('/posts?limit=10')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1 }, { id: 2 }]);

    const responsePost = await supertest(app.getHttpServer())
      .get('/posts/1')
      .send();

    expect({ status: responsePost.status, body: responsePost.body }).toEqual({
      status: 200,
      body: { id: 1 },
    });

    const responseDelete = await supertest(app.getHttpServer())
      .delete('/posts/1')
      .send();

    expect({
      status: responseDelete.status,
      body: responseDelete.body,
    }).toEqual({
      status: 200,
      body: { id: 1 },
    });

    const responseDeleteBad = await supertest(app.getHttpServer())
      .delete('/posts/jeff')
      .send({ id: 1 });

    expect({
      status: responseDeleteBad.status,
      body: responseDeleteBad.body,
    }).toEqual({
      status: 400,
      body: {
        bodyResult: null,
        headersResult: null,
        paramsResult: {
          name: 'ValidationError',
          issues: [
            {
              code: 'invalid_type',
              expected: 'number',
              received: 'nan',
              path: ['id'],
              message: 'Expected number, received nan',
            },
          ],
        },
        queryResult: null,
      },
    });

    const responseCreate = await supertest(app.getHttpServer())
      .post('/posts')
      .send({ title: 'hello', content: 'world' });

    expect({
      status: responseCreate.status,
      body: responseCreate.body,
    }).toEqual({
      status: 201,
      body: {
        id: 1,
        title: 'hello',
        content: 'world',
      },
    });

    const nonJsonResponse = await supertest(app.getHttpServer())
      .get('/html')
      .send();

    expect({
      status: nonJsonResponse.status,
      text: nonJsonResponse.text,
      headers: nonJsonResponse.headers,
    }).toEqual({
      status: 200,
      text: '<h1>hello world</h1>',
      headers: expect.objectContaining({
        'content-type': 'text/html',
        'content-length': '20',
      }),
    });
  });

  it('should support including a nested error as the cause', async () => {
    const c = initContract();

    const contract = c.router({
      getPosts: {
        path: '/posts',
        method: 'GET',
        query: z.object({
          limit: z.string(),
        }),
        responses: {
          200: z.array(
            z.object({
              id: z.number(),
            }),
          ),
        },
      },
    });

    const cause = new Error('the root cause');

    const error = new TsRestException(
      contract.getPosts,
      {
        status: 400,
        body: {
          message: 'Something went wrong',
        },
      },
      {
        cause,
      },
    );

    expect(error.cause).toEqual(cause);
  });

  describe('should handle global configuration', () => {
    const c = initContract();
    const contract = c.router({
      getIndex: {
        method: 'GET',
        path: '/',
        query: z.object({
          foo: z.boolean(),
        }),
        responses: {
          200: z.object({
            foo: z.boolean(),
          }),
        },
      },
    });

    @Controller()
    class TestController {
      @TsRestHandler(contract)
      async handler() {
        return tsRestHandler(contract, {
          getIndex: async ({ query }) => ({
            status: 200,
            body: query,
          }),
        });
      }
    }

    it('express', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
        imports: [
          TsRestModule.register({ validateResponses: true, jsonQuery: true }),
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const server = app.getHttpServer();

      const response = await supertest(server).get('/?foo=true');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ foo: true });
    });

    it('fastify', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
        imports: [
          TsRestModule.register({ validateResponses: true, jsonQuery: true }),
        ],
      }).compile();

      const app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      await app.init();
      await app.getHttpAdapter().getInstance().ready();

      const server = app.getHttpServer();

      const response = await supertest(server).get('/?foo=true');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ foo: true });
    });

    describe('should handle overrides', () => {
      it('method override', async () => {
        @Controller()
        class TestController {
          @TsRestHandler(contract, { jsonQuery: false })
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const server = app.getHttpServer();

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          bodyResult: null,
          headersResult: null,
          paramsResult: null,
          queryResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'boolean',
                message: 'Expected boolean, received string',
                path: ['foo'],
                received: 'string',
              },
            ],
          },
        });
      });

      it('class override', async () => {
        @Controller()
        @TsRest({ jsonQuery: false })
        class TestController {
          @TsRestHandler(contract)
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const server = app.getHttpServer();

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          bodyResult: null,
          headersResult: null,
          paramsResult: null,
          queryResult: {
            name: 'ValidationError',
            issues: [
              {
                code: 'invalid_type',
                expected: 'boolean',
                message: 'Expected boolean, received string',
                path: ['foo'],
                received: 'string',
              },
            ],
          },
        });
      });

      it('method overriding class', async () => {
        @Controller()
        @TsRest({ jsonQuery: false })
        class TestController {
          @TsRestHandler(contract, { jsonQuery: true })
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const server = app.getHttpServer();

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ foo: true });
      });
    });
  });

  describe('should handle no body', () => {
    const c = initContract();
    const contract = c.router({
      getIndex: {
        method: 'POST',
        path: '/',
        body: c.noBody(),
        responses: {
          204: c.noBody(),
        },
      },
    });

    @Controller()
    class TestController {
      @TsRestHandler(contract)
      async handler() {
        return tsRestHandler(contract, {
          getIndex: async () => ({
            status: 204,
            body: undefined,
          }),
        });
      }
    }

    it('express', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const server = app.getHttpServer();

      const response = await supertest(server).post('/');
      expect(response.status).toEqual(204);
      expect(response.text).toEqual('');
      expect(response.headers['content-length']).toBeUndefined();
      expect(response.headers['content-type']).toBeUndefined();
    });

    it('fastify', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      await app.init();
      await app.getHttpAdapter().getInstance().ready();

      const server = app.getHttpServer();

      const response = await supertest(server).post('/');
      expect(response.status).toEqual(204);
      expect(response.text).toEqual('');
      expect(response.headers['content-length']).toBeUndefined();
      expect(response.headers['content-type']).toBeUndefined();
    });
  });
});
