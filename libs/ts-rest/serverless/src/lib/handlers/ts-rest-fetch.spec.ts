import { initContract, TsRestResponseError } from '@ts-rest/core';
import { parse as parseMultipart, getBoundary } from 'parse-multipart-data';
import { z } from 'zod';
import { vi } from 'vitest';
import {
  createFetchHandler,
  FetchHandlerOptions,
  fetchRequestHandler,
  tsr,
} from './ts-rest-fetch';
import { RequestValidationErrorSchema } from '../types';

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
      400: RequestValidationErrorSchema,
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

const mockFn = vi.fn();

const router = tsr
  .routerBuilder(contract)
  .requestMiddleware<{ foo: string }>((req) => {
    req.foo = 'bar';
  })
  .responseHandler((res, req) => {
    res.headers.set('x-foo', req.foo);
  })
  .partialRouter({
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
  })
  .route('test', async ({ query }) => {
    return {
      status: 200,
      body: {
        foo: query.foo,
      },
    };
  })
  .route('throw', async () => {
    throw new Error('Test error');
  });

const options = {
  jsonQuery: true,
  responseValidation: true,
  cors: {
    origin: ['http://localhost'],
    credentials: true,
  },
} as FetchHandlerOptions<{}, { foo: string }>;

const testFetchRequestHandler = (request: Request) => {
  return fetchRequestHandler({
    contract,
    router,
    options,
    request,
  });
};

const newFetchRequestHandler = createFetchHandler(contract, router, options);

describe('fetchRequestHandler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle GET request', async () => {
    const request = new Request('http://localhost/test?foo=bar', {
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response('{"foo":"bar"}', {
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
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle POST request', async () => {
    const request = new Request('http://localhost/ping/123', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response('{"id":123,"pong":"foo"}', {
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
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle no content response', async () => {
    const request = new Request('http://localhost/no-content', {
      method: 'POST',
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
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
    expect(await response.text()).toEqual('');
    expect(mockFn).toHaveBeenCalledWith('bar');
  });

  it('should handle thrown TsRestResponseError', async () => {
    const request = new Request('http://localhost/ping/404', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response('{"message":"Not Found"}', {
      status: 404,
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
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle thrown TsRestResponseError no body', async () => {
    const request = new Request('http://localhost/ping/500', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
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

  it('should handle file upload', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type':
          'multipart/form-data; boundary=---WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      body:
        '-----WebKitFormBoundary7MA4YWxkTrZu0gW\r\n' +
        'Content-Disposition: form-data; name="file"; filename="a.html"\r\n' +
        'Content-Type: text/html\r\n' +
        '\r\n' +
        '<html><body><h1>Hello ts-rest!</h1></body></html>\r\n' +
        '-----WebKitFormBoundary7MA4YWxkTrZu0gW--',
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(
      '<html><body><h1>Hello ts-rest!</h1></body></html>',
      {
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'http://localhost',
          'content-type': 'text/html',
          vary: 'Origin',
          'x-foo': 'bar',
        },
      },
    );

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle validation error', async () => {
    const request = new Request('http://localhost/test', {
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(
      '{"message":"Request validation failed","pathParameterErrors":null,"headerErrors":null,"queryParameterErrors":{"name":"ValidationError","issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["foo"],"message":"Required"}]},"bodyErrors":null}',
      {
        status: 400,
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'http://localhost',
          'content-type': 'application/json',
          vary: 'Origin',
          'x-foo': 'bar',
        },
      },
    );
    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    const body = await response.json();
    expect(body).toEqual(await expectedResponse.json());
    expect(() => {
      RequestValidationErrorSchema.parse(body);
    }).not.toThrowError();
  });

  it('should handle 500 response', async () => {
    const request = new Request('http://localhost/throw', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
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

  it('should handle custom context', async () => {
    type PlatformContext = {
      foo: string;
    };

    const fetchRequestHandlerWithContext = (
      request: Request,
      platformContext: PlatformContext,
    ) => {
      const contract = c.router({
        test: {
          method: 'GET',
          path: '/test',
          responses: {
            200: z.object({}).passthrough(),
          },
        },
      });

      const router = tsr.platformContext<PlatformContext>().router(contract, {
        test: async (_, { foo }) => {
          return {
            status: 200,
            body: {
              foo,
            },
          };
        },
      });

      return fetchRequestHandler({
        contract,
        router,
        options: {},
        request,
        platformContext,
      });
    };

    const request = new Request('http://localhost/test', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const response = await fetchRequestHandlerWithContext(request, {
      foo: 'context-bar',
    });
    const expectedResponse = new Response('{"foo":"context-bar"}', {
      headers: {
        'content-type': 'application/json',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual(await expectedResponse.json());
  });
});
