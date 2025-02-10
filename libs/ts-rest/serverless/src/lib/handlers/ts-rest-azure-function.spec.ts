import { HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { TsRestResponseError, initContract } from '@ts-rest/core';
import { parse as parseMultipart, getBoundary } from 'parse-multipart-data';
import { vi } from 'vitest';
import { z } from 'zod';
import { TsRestRequest } from '../request';
import { createAzureFunctionHandler } from './ts-rest-azure-function';

const c = initContract();

const contract = c.router({
  test: {
    method: 'GET',
    path: '/test',
    query: z.object({
      foo: z.string(),
    }),
    responses: {
      200: z.object({
        foo: z.string(),
      }),
    },
  },
  ping: {
    method: 'POST',
    path: '/ping/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: z.object({
      ping: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.number(),
        pong: z.string(),
      }),
      404: z.object({
        message: z.literal('Not Found'),
      }),
      500: c.noBody(),
    },
  },
  noContent: {
    method: 'POST',
    path: '/no-content',
    body: c.noBody(),
    responses: {
      204: c.noBody(),
    },
  },
  upload: {
    method: 'POST',
    path: '/upload',
    contentType: 'multipart/form-data',
    body: c.type<{ file: File }>(),
    responses: {
      200: c.otherResponse({
        contentType: 'application/octet-stream',
        body: c.type<Blob | string>(),
      }),
    },
  },
  throw: {
    method: 'GET',
    path: '/throw',
    responses: {
      500: c.noBody(),
    },
  },
});

describe('tsRestAzureFunction', () => {
  const mockFn = vi.fn();

  const azureFunctionHandler = createAzureFunctionHandler(
    contract,
    {
      test: async ({ query }) => {
        return {
          status: 200,
          body: {
            foo: query.foo,
          },
        };
      },
      ping: async ({ body, params }) => {
        if (params.id === 500) {
          throw new TsRestResponseError(contract.ping, {
            status: 500,
            body: undefined,
          });
        }

        if (params.id === 404) {
          throw new TsRestResponseError(contract.ping, {
            status: 404,
            body: {
              message: 'Not Found',
            },
          });
        }

        return {
          status: 200,
          body: {
            id: params.id,
            pong: body.ping,
          },
        };
      },
      noContent: {
        middleware: [(req) => mockFn(req.foo)],
        handler: async () => {
          return {
            status: 204,
            body: undefined,
          } as const;
        },
      },
      upload: async (_, { request }) => {
        const boundary = getBoundary(
          request.headers.get('content-type') as string,
        );

        const bodyBuffer = await request.arrayBuffer();
        const parts = parseMultipart(Buffer.from(bodyBuffer), boundary);
        const blob = new Blob([parts[0].data], { type: parts[0].type });

        return {
          status: 200,
          body: blob,
        };
      },
      throw: async () => {
        throw new Error('Test error');
      },
    },
    {
      jsonQuery: true,
      responseValidation: true,
      cors: {
        origin: ['http://localhost'],
        credentials: true,
      },
      errorHandler: (err, req, args) => {
        args.azureContext.log('test');
      },
      requestMiddleware: [
        (req: TsRestRequest & { foo: string }) => {
          req.foo = 'bar';
        },
      ],
      responseHandlers: [
        (res, req) => {
          res.headers.set('x-foo', req.foo);
        },
      ],
    },
  );

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle GET request', async () => {
    const httpRequest = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/test?foo=bar',
      headers: {
        origin: 'http://localhost',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
      body: '{"foo":"bar"}',
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle POST request', async () => {
    const httpRequest = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/ping/123',
      body: { string: '{"ping":"foo"}' },
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
      body: '{"id":123,"pong":"foo"}',
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle no content', async () => {
    const httpRequest = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/no-content',
      headers: {
        origin: 'http://localhost',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(response.body).toEqual(expectedResponse.body);
  });

  it('OPTIONS request should return all CORS headers', async () => {
    const httpRequest = new HttpRequest({
      method: 'OPTIONS',
      url: 'http://localhost/test',
      headers: {
        origin: 'http://localhost',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': '*',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Access-Control-Request-Headers, Origin',
        'x-foo': 'undefined',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(response.body).toEqual(expectedResponse.body);
  });

  it('should handle failed request validation', async () => {
    const httpRequest = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/test',
      headers: {
        origin: 'http://localhost',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 400,
      body: '{"message":"Request validation failed","pathParameterErrors":null,"headerErrors":null,"queryParameterErrors":{"issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["foo"],"message":"Required"}],"name":"ZodError"},"bodyErrors":null}',
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle thrown TsRestResponseError', async () => {
    const httpRequest = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/ping/404',
      body: { string: '{"ping":"foo"}' },
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 404,
      body: '{"message":"Not Found"}',
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle thrown TsRestResponseError no body', async () => {
    const httpRequest = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/ping/500',
      body: { string: '{"ping":"foo"}' },
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
    });
    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 500,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual('');
  });

  it('should have access to platformArgs in the errorHandler', async () => {
    const httpRequest = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/throw',
      headers: {
        origin: 'http://localhost',
      },
    });

    const context = {
      log: vi.fn(),
    } as unknown as InvocationContext;

    await azureFunctionHandler(httpRequest, context);

    expect(context.log).toBeCalledWith('test');
  });

  it('should handle 500 response', async () => {
    const httpRequest = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/throw',
      headers: {
        origin: 'http://localhost',
      },
    });

    const context = new InvocationContext({});

    const response = await azureFunctionHandler(httpRequest, context);

    const expectedResponse = new HttpResponse({
      status: 500,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual({ message: 'Server Error' });
  });
});
