import {
  AppRoute,
  AppRouteMutation,
  AppRouteQuery,
  AppRouter,
  FlattenAppRouter,
  ServerInferRequest,
  ServerInferResponseBody,
  ServerInferResponses,
} from '@ts-rest/core';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import * as Koa from 'koa';
import { ICookies } from 'cookies';

import { RequestValidationError } from './request-validation-error';
import { AnyZodObject } from 'zod';

export type AppRouteQueryImplementation<
  T extends AppRouteQuery,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = (
  input: ServerInferRequest<T, IncomingHttpHeaders> & {
    ctx: TsRestContext<T, TState, TCtx>;
  },
) => Promise<ServerInferResponses<T>>;

export type AppRouteMutationImplementation<
  T extends AppRouteMutation,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = (
  input: ServerInferRequest<T, IncomingHttpHeaders> & {
    ctx: { files: unknown; file: unknown } & TsRestContext<T, TState, TCtx>;
  },
) => Promise<ServerInferResponses<T>>;

export type AppRouteImplementation<
  T extends AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = T extends AppRouteMutation
  ? AppRouteMutationImplementation<T, TState, TCtx>
  : T extends AppRouteQuery
  ? AppRouteQueryImplementation<T, TState, TCtx>
  : never;

export type TsRestContext<
  T extends AppRouter | AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
  F extends FlattenAppRouter<T> = FlattenAppRouter<T>,
  S extends ServerInferRequest<F> = ServerInferRequest<F>,
  R extends ServerInferResponseBody<F> = ServerInferResponseBody<F>,
  Headers = 'headers' extends keyof S ? S['headers'] : never,
  Query = 'query' extends keyof S ? S['query'] : never,
> = {
  state: TState;
  headers: Headers;
  params: 'params' extends keyof S ? S['params'] : never;
  query: Query;
  request: Omit<Koa.Request, 'headers' | 'query' | 'body'> & {
    headers: Headers;
    query: Query;
    body: 'body' extends keyof S ? S['body'] : never;
  };
  response: Omit<Koa.Response, 'body'> & { body: R };
  body: R;
  app: Koa.Context['app'];
  req: IncomingMessage;
  res: ServerResponse;
  originalUrl: string;
  cookies: ICookies;
  accept: Koa.Context['accept'];
  /**
   * To bypass Koa's built-in response handling, you may explicitly set `ctx.respond = false;`
   */
  respond: boolean | undefined;
  tsRestRoute: F;
} & TCtx &
  Omit<Koa.BaseContext, 'headers' | 'query'>;

export type TsRestMiddleware<
  T extends AppRouter | AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = (
  ctx: TsRestContext<T, TState, TCtx>,
  next: Koa.Next,
) => Promise<void> | void;

export type AppRouteOptions<
  TRoute extends AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = {
  middleware?: TsRestMiddleware<TRoute, TState, TCtx>[];
  handler: AppRouteImplementation<TRoute, TState, TCtx>;
};

export type AppRouteImplementationOrOptions<
  TRoute extends AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> =
  | AppRouteOptions<TRoute, TState, TCtx>
  | AppRouteImplementation<TRoute, TState, TCtx>;

export const isAppRouteImplementation = <
  TRoute extends AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
>(
  obj: AppRouteImplementationOrOptions<TRoute, TState, TCtx>,
): obj is AppRouteImplementation<TRoute, TState, TCtx> =>
  typeof obj === 'function';

export type RouterOptions = {
  customCtxSchema: AnyZodObject;
  stateSchema: AnyZodObject;
};

export type RouterImplementation<
  T extends AppRouter,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = {
  [TKey in keyof T]: T[TKey] extends AppRouter
    ? RouterImplementation<T[TKey], TState, TCtx>
    : T[TKey] extends AppRoute
    ? AppRouteImplementationOrOptions<T[TKey], TState, TCtx>
    : never;
};

export type TsRestKoaOptions<
  T extends AppRouter,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
> = {
  logInitialization?: boolean;
  jsonQuery?: boolean;
  responseValidation?: boolean;
  globalMiddleware?: TsRestMiddleware<FlattenAppRouter<T>, TState, TCtx>[];
  requestValidationErrorHandler?:
    | 'combined'
    | ((
        ctx: TsRestContext<
          FlattenAppRouter<T>,
          { err: RequestValidationError } & TState,
          TCtx
        >,
        next: Koa.Next,
      ) => void);
};
