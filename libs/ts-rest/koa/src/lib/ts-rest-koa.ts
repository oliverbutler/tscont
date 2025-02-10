import { Stream } from 'node:stream';

import '@koa/bodyparser';
import * as Router from '@koa/router';
import {
  AppRoute,
  AppRouter,
  checkZodSchema,
  HTTPStatusCode,
  isAppRoute,
  isAppRouteNoBody,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  TsRestResponseError,
  validateResponse,
} from '@ts-rest/core';
import * as Koa from 'koa';

import { RequestValidationError } from './request-validation-error';
import {
  AppRouteImplementationOrOptions,
  isAppRouteImplementation,
  RouterImplementation,
  TsRestKoaOptions,
  TsRestMiddleware,
} from './types';

const router = <
  T extends AppRouter = AppRouter,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
  TRouter extends RouterImplementation<T, TState, TCtx> = RouterImplementation<
    T,
    TState,
    TCtx
  >,
>(
  contract: T,
  router: TRouter,
): TRouter => router;

const route = <
  T extends AppRoute,
  TState = Koa.DefaultState,
  TCtx = Koa.DefaultContext,
  TRoute extends AppRouteImplementationOrOptions<
    T,
    TState,
    TCtx
  > = AppRouteImplementationOrOptions<T, TState, TCtx>,
>(
  contract: T,
  route: TRoute,
) => route;

export const initServer = () => ({ router, route });

const recursivelyApplyKoaRouter = ({
  schema,
  router,
  processRoute,
}: {
  schema: AppRouter | AppRoute;
  router: RouterImplementation<any> | AppRouteImplementationOrOptions<any>;
  processRoute: (
    implementation: AppRouteImplementationOrOptions<AppRoute>,
    schema: AppRoute,
  ) => void;
}): void => {
  if (typeof router === 'object' && typeof router?.handler !== 'function') {
    for (const key in router) {
      if (isAppRoute(schema)) {
        throw new Error(`[ts-rest] Expected AppRouter but received AppRoute`);
      }

      recursivelyApplyKoaRouter({
        schema: schema[key],
        router: (router as RouterImplementation<any>)[key],
        processRoute,
      });
    }
  } else if (
    typeof router === 'function' ||
    typeof router?.handler === 'function'
  ) {
    if (!isAppRoute(schema)) {
      throw new Error(`[ts-rest] Expected AppRoute but received AppRouter`);
    }

    processRoute(router as AppRouteImplementationOrOptions<AppRoute>, schema);
  }
};

const validateRequest = (
  ctx: Koa.Context,
  schema: AppRoute,
  options: TsRestKoaOptions<AppRouter>,
) => {
  const paramsResult = checkZodSchema(ctx['params'], schema.pathParams, {
    passThroughExtraKeys: true,
  });

  const headersResult = checkZodSchema(ctx.headers, schema.headers, {
    passThroughExtraKeys: true,
  });

  const query = options.jsonQuery
    ? parseJsonQueryObject(ctx.query as Record<string, string>)
    : ctx.query;

  const queryResult = checkZodSchema(query, schema.query);

  const bodyResult = checkZodSchema(
    ctx.request.body,
    'body' in schema ? schema.body : null,
  );

  if (
    !paramsResult.success ||
    !headersResult.success ||
    !queryResult.success ||
    !bodyResult.success
  ) {
    throw new RequestValidationError(
      !paramsResult.success ? paramsResult.error : null,
      !headersResult.success ? headersResult.error : null,
      !queryResult.success ? queryResult.error : null,
      !bodyResult.success ? bodyResult.error : null,
    );
  }

  return {
    paramsResult,
    headersResult,
    queryResult,
    bodyResult,
  };
};

const initializeKoaRoute = ({
  implementationOrOptions,
  schema,
  koaRouter,
  options,
}: {
  implementationOrOptions: AppRouteImplementationOrOptions<AppRoute>;
  schema: AppRoute;
  koaRouter: Router;
  options: TsRestKoaOptions<any>;
}) => {
  if (options.logInitialization) {
    console.log(`[ts-rest] Initialized ${schema.method} ${schema.path}`);
  }

  const handler = isAppRouteImplementation(implementationOrOptions)
    ? implementationOrOptions
    : implementationOrOptions.handler;

  const mainReqHandler: TsRestMiddleware<AppRoute> = async (ctx) => {
    const validationResults = validateRequest(ctx, schema, options);

    let result: { status: HTTPStatusCode; body: any };
    try {
      result = await handler({
        params: validationResults.paramsResult.data as any,
        body: validationResults.bodyResult.data as any,
        query: validationResults.queryResult.data,
        headers: validationResults.headersResult.data as any,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        files: ctx.files,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        file: ctx.file,
        ctx: ctx as any,
      });
    } catch (e) {
      if (e instanceof TsRestResponseError) {
        result = {
          status: e.statusCode,
          body: e.body,
        };
      } else {
        throw e;
      }
    }

    const statusCode = Number(result.status);

    if (result.body instanceof Stream) {
      ctx.body = result.body;
      ctx.status = statusCode;
      return;
    }

    let validatedResponseBody = result.body;

    if (options.responseValidation) {
      const response = validateResponse({
        appRoute: schema,
        response: {
          status: statusCode,
          body: result.body,
        },
      });

      validatedResponseBody = response.body;
    }

    const responseType = schema.responses[statusCode];

    if (isAppRouteNoBody(responseType)) {
      ctx.status = statusCode;
      return;
    }

    if (isAppRouteOtherResponse(responseType)) {
      ctx.set('content-type', responseType.contentType);
    }

    ctx.status = statusCode;
    ctx.body = validatedResponseBody;
  };

  const handlers: TsRestMiddleware<AppRoute>[] = [
    (ctx, next) => {
      ctx.tsRestRoute = schema as any;
      return next();
    },
  ];

  if (options.globalMiddleware) {
    handlers.push(...options.globalMiddleware);
  }

  if (
    !isAppRouteImplementation(implementationOrOptions) &&
    implementationOrOptions.middleware
  ) {
    handlers.push(...implementationOrOptions.middleware);
  }

  handlers.push(mainReqHandler);

  switch (schema.method) {
    case 'GET':
      koaRouter.get(schema.path, ...handlers);
      break;
    case 'DELETE':
      koaRouter.delete(schema.path, ...handlers);
      break;
    case 'POST':
      koaRouter.post(schema.path, ...handlers);
      break;
    case 'PUT':
      koaRouter.put(schema.path, ...handlers);
      break;
    case 'PATCH':
      koaRouter.patch(schema.path, ...handlers);
      break;
  }
};

const requestValidationErrorHandler = (
  handler: TsRestKoaOptions<any>['requestValidationErrorHandler'] = 'combined',
) => {
  return async (ctx: Koa.Context, next: Koa.Next) => {
    try {
      await next();
    } catch (err) {
      ctx.state['err'] = err;

      if (err instanceof RequestValidationError) {
        if (handler === 'combined') {
          ctx.status = 400;
          ctx.body = {
            pathParameterErrors: err.pathParams,
            headerErrors: err.headers,
            queryParameterErrors: err.query,
            bodyErrors: err.body,
          };
          return;
        }

        if (typeof handler === 'function') {
          return handler(ctx as any, next);
        }
      }

      throw err;
    }
  };
};

/**
 * @param schema - the `ts-rest` contract for this router
 * @param router - the `ts-rest` implementation of the router
 * @param koaApp - the koa instance
 * @param koaRouter - the \@koa/router instance
 * @param options
 */
export const createKoaEndpoints = <TRouter extends AppRouter>(
  schema: TRouter,
  router: RouterImplementation<TRouter, any, any>,
  koaApp: Koa,
  koaRouter: Router,
  options: TsRestKoaOptions<TRouter> = {
    logInitialization: true,
    jsonQuery: false,
    responseValidation: false,
    requestValidationErrorHandler: 'combined',
  },
) => {
  koaApp.use((ctx, next) => {
    ctx.response.body = null;
    return next();
  });

  koaApp.use(
    requestValidationErrorHandler(options.requestValidationErrorHandler as any),
  );

  recursivelyApplyKoaRouter({
    schema,
    router,
    processRoute: (implementation, innerSchema) => {
      initializeKoaRoute({
        implementationOrOptions: implementation,
        schema: innerSchema,
        koaRouter,
        options,
      });
    },
  });
};
