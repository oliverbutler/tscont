import {
  AppRoute,
  AppRouter,
  checkZodSchema,
  FlattenAppRouter,
  HTTPStatusCode,
  isAppRouteNoBody,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  ServerInferRequest,
  ServerInferResponses,
  TsRestResponseError,
  validateResponse,
  ZodErrorSchema,
} from '@ts-rest/core';
import * as fastify from 'fastify';
import { z } from 'zod';

export class RequestValidationError extends Error {
  constructor(
    public pathParams: z.ZodError | null,
    public headers: z.ZodError | null,
    public query: z.ZodError | null,
    public body: z.ZodError | null,
  ) {
    super('[ts-rest] request validation failed');
  }
}

export const RequestValidationErrorSchema = z.object({
  pathParameterErrors: ZodErrorSchema.nullable(),
  headerErrors: ZodErrorSchema.nullable(),
  queryParameterErrors: ZodErrorSchema.nullable(),
  bodyErrors: ZodErrorSchema.nullable(),
});

type FastifyContextConfig<T extends AppRouter | AppRoute> = {
  tsRestRoute: T extends AppRoute ? T : FlattenAppRouter<T>;
};

type AppRouteImplementation<T extends AppRoute> = (
  input: ServerInferRequest<T, fastify.FastifyRequest['headers']> & {
    request: fastify.FastifyRequest<
      fastify.RouteGenericInterface,
      fastify.RawServerDefault,
      fastify.RawRequestDefaultExpression,
      fastify.FastifySchema,
      fastify.FastifyTypeProviderDefault,
      FastifyContextConfig<T>
    >;
    reply: fastify.FastifyReply<
      fastify.RequestGenericInterface,
      fastify.RawServerDefault,
      fastify.RawRequestDefaultExpression,
      fastify.RawReplyDefaultExpression,
      FastifyContextConfig<T>
    >;
    appRoute: T;
  },
) => Promise<ServerInferResponses<T>>;

export type RouterImplementation<T extends AppRouter> = {
  [TKey in keyof T]: T[TKey] extends AppRouter
    ? RouterImplementation<T[TKey]>
    : T[TKey] extends AppRoute
    ? AppRouteImplementationOrOptions<T[TKey]>
    : never;
};

export type RouteHooks<T extends AppRouter | AppRoute> = Pick<
  fastify.RouteOptions<
    fastify.RawServerDefault,
    fastify.RawRequestDefaultExpression,
    fastify.RawReplyDefaultExpression,
    fastify.RouteGenericInterface,
    FastifyContextConfig<T>
  >,
  | 'preParsing'
  | 'preValidation'
  | 'preHandler'
  | 'preSerialization'
  | 'onRequest'
  | 'onSend'
  | 'onResponse'
  | 'onTimeout'
  | 'onError'
  | 'onRequestAbort'
>;

export type ApplicationHooks<TContract extends AppRouter> =
  RouteHooks<TContract> & {
    onRoute?:
      | fastify.onRouteHookHandler<
          fastify.RawServerDefault,
          fastify.RawRequestDefaultExpression,
          fastify.RawReplyDefaultExpression,
          fastify.RouteGenericInterface,
          FastifyContextConfig<TContract>
        >
      | fastify.onRouteHookHandler<
          fastify.RawServerDefault,
          fastify.RawRequestDefaultExpression,
          fastify.RawReplyDefaultExpression,
          fastify.RouteGenericInterface,
          FastifyContextConfig<TContract>
        >[];
  };

type BaseRegisterRouterOptions = {
  logInitialization?: boolean;
  jsonQuery?: boolean;
  responseValidation?: boolean;
  requestValidationErrorHandler?:
    | 'combined'
    | ((
        err: RequestValidationError,
        request: fastify.FastifyRequest,
        reply: fastify.FastifyReply,
      ) => void);
};

type RegisterRouterOptions<T extends AppRouter> = BaseRegisterRouterOptions & {
  hooks?: ApplicationHooks<T>;
};

type AppRouteOptions<TRoute extends AppRoute> = {
  hooks?: RouteHooks<TRoute>;
  handler: AppRouteImplementation<TRoute>;
};

type AppRouteImplementationOrOptions<TRoute extends AppRoute> =
  | AppRouteOptions<TRoute>
  | AppRouteImplementation<TRoute>;

const isAppRouteImplementation = <TRoute extends AppRoute>(
  obj: AppRouteImplementationOrOptions<TRoute>,
): obj is AppRouteImplementation<TRoute> => {
  return typeof obj === 'function';
};

const validateRequest = (
  request: fastify.FastifyRequest,
  reply: fastify.FastifyReply,
  schema: AppRoute,
  options: BaseRegisterRouterOptions,
) => {
  const paramsResult = checkZodSchema(request.params, schema.pathParams, {
    passThroughExtraKeys: true,
  });

  const headersResult = checkZodSchema(request.headers, schema.headers, {
    passThroughExtraKeys: true,
  });

  const queryResult = checkZodSchema(
    options.jsonQuery
      ? parseJsonQueryObject(request.query as Record<string, string>)
      : request.query,
    schema.query,
  );

  const bodyResult = checkZodSchema(
    request.body,
    'body' in schema ? schema.body : null,
  );

  if (
    !paramsResult.success ||
    !headersResult.success ||
    !queryResult.success ||
    !bodyResult.success
  ) {
    throw new RequestValidationError(
      paramsResult.success ? null : paramsResult.error,
      headersResult.success ? null : headersResult.error,
      queryResult.success ? null : queryResult.error,
      bodyResult.success ? null : bodyResult.error,
    );
  }

  return {
    paramsResult,
    headersResult,
    queryResult,
    bodyResult,
  };
};

const RouterEmbeddedContract = Symbol('RouterEmbeddedContract');

export const initServer = () => ({
  router: <TContract extends AppRouter>(
    contract: TContract,
    routes: RouterImplementation<TContract>,
  ): RouterImplementation<TContract> => ({
    ...routes,
    [RouterEmbeddedContract]: contract,
  }),
  route: <TAppRoute extends AppRoute>(
    route: TAppRoute,
    implementation: AppRouteImplementation<TAppRoute>,
  ) => implementation,
  registerRouter: <
    T extends RouterImplementation<TContract>,
    TContract extends AppRouter,
  >(
    contract: TContract,
    routerImpl: T,
    app: fastify.FastifyInstance,
    options: RegisterRouterOptions<TContract> = {
      logInitialization: true,
      jsonQuery: false,
      responseValidation: false,
      requestValidationErrorHandler: 'combined',
    },
  ) => {
    const { hooks = {}, ...restOfOptions } = options;

    Object.entries(hooks).forEach(([hookName, hookOrHookArray]) => {
      if (Array.isArray(hookOrHookArray)) {
        hookOrHookArray.forEach((hook) => {
          // @ts-expect-error - function expects specific hook names rather than just a string
          app.addHook(hookName, hook);
        });
        return;
      } else {
        // @ts-expect-error - function expects specific hook names rather than just a string
        app.addHook(hookName, hookOrHookArray);
      }
    });

    recursivelyRegisterRouter(routerImpl, contract, [], app, restOfOptions);

    app.setErrorHandler(
      requestValidationErrorHandler(options.requestValidationErrorHandler),
    );
  },
  plugin:
    <T extends AppRouter>(
      router: RouterImplementation<T>,
    ): fastify.FastifyPluginCallback<RegisterRouterOptions<T>> =>
    (
      app,
      opts = {
        logInitialization: true,
        jsonQuery: false,
        responseValidation: false,
        requestValidationErrorHandler: 'combined',
      },
      done,
    ) => {
      const embeddedContract = (
        router as RouterImplementation<T> & { [RouterEmbeddedContract]: T }
      )[RouterEmbeddedContract];

      const { hooks = {}, ...restOfOptions } = opts;

      Object.entries(hooks).forEach(([hookName, hookOrHookArray]) => {
        if (Array.isArray(hookOrHookArray)) {
          hookOrHookArray.forEach((hook) => {
            // @ts-expect-error - function expects specific hook names rather than just a string
            app.addHook(hookName, hook);
          });
          return;
        } else {
          // @ts-expect-error - function expects specific hook names rather than just a string
          app.addHook(hookName, hookOrHookArray);
        }
      });

      recursivelyRegisterRouter(
        router,
        embeddedContract,
        [],
        app,
        restOfOptions,
      );

      app.setErrorHandler(
        requestValidationErrorHandler(opts.requestValidationErrorHandler),
      );

      done();
    },
});

const requestValidationErrorHandler = (
  handler: BaseRegisterRouterOptions['requestValidationErrorHandler'] = 'combined',
) => {
  return (
    err: unknown,
    request: fastify.FastifyRequest,
    reply: fastify.FastifyReply,
  ) => {
    if (err instanceof RequestValidationError) {
      if (handler === 'combined') {
        return reply.status(400).send({
          pathParameterErrors: err.pathParams,
          headerErrors: err.headers,
          queryParameterErrors: err.query,
          bodyErrors: err.body,
        });
      } else {
        return handler(err, request, reply);
      }
    } else {
      return reply.send(err);
    }
  };
};

/**
 * @param routeImpl - User's implementation of the route
 * @param appRoute - the `ts-rest` contract for this route (e.g. with Path, params, query, body, etc.)
 * @param app - the fastify instance to register the route on
 * @param options - options for the routers
 */
const registerRoute = <TAppRoute extends AppRoute>(
  routeImpl: AppRouteImplementationOrOptions<AppRoute>,
  appRoute: TAppRoute,
  app: fastify.FastifyInstance,
  options: BaseRegisterRouterOptions,
) => {
  if (options.logInitialization) {
    app.log.info(`[ts-rest] Initialized ${appRoute.method} ${appRoute.path}`);
  }

  const handler = isAppRouteImplementation(routeImpl)
    ? routeImpl
    : routeImpl.handler;

  const hooks = isAppRouteImplementation(routeImpl)
    ? {}
    : routeImpl.hooks || {};

  const route: fastify.RouteOptions<
    fastify.RawServerDefault,
    fastify.RawRequestDefaultExpression,
    fastify.RawReplyDefaultExpression,
    fastify.RouteGenericInterface,
    FastifyContextConfig<AppRoute>
  > = {
    ...hooks,
    method: appRoute.method,
    url: appRoute.path,
    config: {
      tsRestRoute: appRoute,
    },
    handler: async (request, reply) => {
      const validationResults = validateRequest(
        request,
        reply,
        appRoute,
        options,
      );

      let result: { status: HTTPStatusCode; body: unknown };
      try {
        result = await handler({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params: validationResults.paramsResult.data as any,
          query: validationResults.queryResult.data,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers: validationResults.headersResult.data as any,
          request,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: validationResults.bodyResult.data as any,
          reply,
          appRoute,
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

      const statusCode = result.status;

      let validatedResponseBody = result.body;

      if (options.responseValidation) {
        const response = validateResponse({
          appRoute,
          response: {
            status: statusCode,
            body: result.body,
          },
        });

        validatedResponseBody = response.body;
      }

      const responseType = appRoute.responses[statusCode];

      if (isAppRouteNoBody(responseType)) {
        return reply.status(statusCode).send();
      }

      if (isAppRouteOtherResponse(responseType)) {
        reply.header('content-type', responseType.contentType);
      }

      return reply.status(statusCode).send(validatedResponseBody);
    },
  };

  app.route(route);
};

/**
 *
 * @param routerImpl - the user's implementation of the router
 * @param appRouter - the `ts-rest` contract for this router
 * @param path - the path to the current router, e.g. ["posts", "getPosts"]
 * @param fastify  - the fastify instance to register the route on
 * @param options
 */
const recursivelyRegisterRouter = <T extends AppRouter>(
  routerImpl: RouterImplementation<T>,
  appRouter: T,
  path: string[],
  fastify: fastify.FastifyInstance,
  options: BaseRegisterRouterOptions,
) => {
  if (
    typeof routerImpl === 'object' &&
    typeof routerImpl?.['handler'] !== 'function'
  ) {
    for (const key in routerImpl) {
      recursivelyRegisterRouter(
        routerImpl[key] as unknown as RouterImplementation<T>,
        appRouter[key] as unknown as T,
        [...path, key],
        fastify,
        options,
      );
    }
  } else if (
    typeof routerImpl === 'function' ||
    typeof routerImpl?.['handler'] === 'function'
  ) {
    registerRoute(
      routerImpl as unknown as AppRouteImplementationOrOptions<AppRoute>,
      appRouter as unknown as AppRoute,
      fastify,
      options,
    );
  }
};
