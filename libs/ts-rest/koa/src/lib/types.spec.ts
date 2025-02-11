import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { AppRouteImplementation } from './types';

export type Equal<a, b> = (<T>() => T extends a ? 1 : 2) extends <
  T,
>() => T extends b ? 1 : 2
  ? true
  : false;

export type Expect<a extends true> = a;

const c = initContract();

const contract = c.router({
  postSomethingIndex: {
    method: 'POST',
    path: `/:something/index.html`,
    body: z.object({
      echoHtml: z.string(),
    }),
    query: z.object({
      extraPath: z.string().optional(),
    }),
    headers: z.object({
      'x-application-index': z.literal('index'),
    }),
    pathParams: z.object({
      something: z.string(),
    }),
    responses: {
      200: c.otherResponse({
        contentType: 'text/html',
        body: z.string().regex(/^<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>$/im),
      }),
    },
  },
});

it('should have type inference on req', () => {
  type PostIndexImplementation = AppRouteImplementation<
    typeof contract.postSomethingIndex,
    { foo: 'bar' },
    { baz: 'qux' }
  >;

  type PostIndexParam = Parameters<PostIndexImplementation>[0];

  type PostIndexCtx = PostIndexParam['ctx'];
  type PostIndexReq = PostIndexCtx['request'];

  type PostIndexBod = PostIndexReq['body'];

  type ShouldHaveCustomState = Expect<
    Equal<PostIndexCtx['state'], { foo: 'bar' }>
  >;
  type ShouldHaveCustomCtx = Expect<Equal<PostIndexCtx['baz'], 'qux'>>;

  type ShouldHaveReq = Expect<
    Equal<
      PostIndexBod,
      {
        echoHtml: string;
      }
    >
  >;

  type PostIndexHeaders = PostIndexCtx['headers'];

  type ShouldHaveHeaders = Expect<
    Equal<
      PostIndexHeaders,
      {
        'x-application-index': 'index';
      }
    >
  >;

  type PostIndexReqHeaders = PostIndexReq['headers'];

  type ShouldHaveReqHeaders = Expect<
    Equal<
      PostIndexReqHeaders,
      {
        'x-application-index': 'index';
      }
    >
  >;

  type ShouldHaveMatchingHeaders = Equal<PostIndexHeaders, PostIndexReqHeaders>;

  type PostIndexQuery = PostIndexCtx['query'];

  type ShouldHaveQuery = Expect<
    Equal<
      PostIndexQuery,
      {
        extraPath?: string;
      }
    >
  >;

  type PostIndexParams = PostIndexCtx['params'];

  type ShouldHaveParams = Expect<
    Equal<
      PostIndexParams,
      {
        something: string;
      }
    >
  >;
});
