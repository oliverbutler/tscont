import {
  AppRoute,
  AppRouter,
  checkStandardSchema,
  HTTPStatusCode,
  isAppRoute,
  isAppRouteNoBody,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  TsRestResponseError,
  validateResponse,
} from '@ts-rest/core';
import type {
  IRouter,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express-serve-static-core';
import {
  AppRouteImplementationOrOptions,
  TsRestExpressOptions,
  RouterImplementation,
  TsRestRequestHandler,
  isAppRouteImplementation,
} from './types';
import { RequestValidationError } from './request-validation-error';
import { Stream } from 'stream';

export const initServer = () => {
  return {
    router: <
      T extends AppRouter = AppRouter,
      TRouter extends RouterImplementation<T> = RouterImplementation<T>,
    >(
      contract: T,
      router: TRouter,
    ) => router,
    route: <
      T extends AppRoute,
      TRoute extends
        AppRouteImplementationOrOptions<T> = AppRouteImplementationOrOptions<T>,
    >(
      contract: T,
      route: TRoute,
    ) => route,
  };
};

const recursivelyApplyExpressRouter = ({
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

      recursivelyApplyExpressRouter({
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
  req: Request,
  res: Response,
  schema: AppRoute,
  options: TsRestExpressOptions<AppRouter>,
) => {
  const paramsResult = checkStandardSchema(req.params, schema.pathParams, {
    passThroughExtraKeys: true,
  });

  const headersResult = checkStandardSchema(req.headers, schema.headers, {
    passThroughExtraKeys: true,
  });

  const query = options.jsonQuery
    ? parseJsonQueryObject(req.query as Record<string, string>)
    : req.query;

  const queryResult = checkStandardSchema(query, schema.query);

  const bodyResult = checkStandardSchema(
    req.body,
    'body' in schema ? schema.body : null,
  );

  if (
    paramsResult.error ||
    headersResult.error ||
    queryResult.error ||
    bodyResult.error
  ) {
    throw new RequestValidationError(
      paramsResult.error || null,
      headersResult.error || null,
      queryResult.error || null,
      bodyResult.error || null,
    );
  }

  return {
    paramsResult,
    headersResult,
    queryResult,
    bodyResult,
  };
};

const initializeExpressRoute = ({
  implementationOrOptions,
  schema,
  app,
  options,
}: {
  implementationOrOptions: AppRouteImplementationOrOptions<AppRoute>;
  schema: AppRoute;
  app: IRouter;
  options: TsRestExpressOptions<any>;
}) => {
  if (options.logInitialization) {
    console.log(`[ts-rest] Initialized ${schema.method} ${schema.path}`);
  }

  const handler = isAppRouteImplementation(implementationOrOptions)
    ? implementationOrOptions
    : implementationOrOptions.handler;

  const mainReqHandler: RequestHandler = async (req, res, next) => {
    try {
      const validationResults = validateRequest(req, res, schema, options);

      let result: { status: HTTPStatusCode; body: any };
      try {
        result = await handler({
          params: validationResults.paramsResult.value as any,
          body: validationResults.bodyResult.value as any,
          query: validationResults.queryResult.value,
          headers: validationResults.headersResult.value as any,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          files: req.files,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          file: req.file,
          req: req as any,
          res: res,
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
        return result.body.pipe(res.status(result.status));
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
        return res.status(statusCode).end();
      }

      if (isAppRouteOtherResponse(responseType)) {
        res.setHeader('content-type', responseType.contentType);
        return res.status(statusCode).send(validatedResponseBody);
      }

      return res.status(statusCode).json(validatedResponseBody);
    } catch (e) {
      return next(e);
    }
  };

  const handlers: TsRestRequestHandler<AppRoute>[] = [
    (req, res, next) => {
      req.tsRestRoute = schema as any;
      next();
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
      app.get(schema.path, ...(handlers as RequestHandler[]));
      break;
    case 'DELETE':
      app.delete(schema.path, ...(handlers as RequestHandler[]));
      break;
    case 'POST':
      app.post(schema.path, ...(handlers as RequestHandler[]));
      break;
    case 'PUT':
      app.put(schema.path, ...(handlers as RequestHandler[]));
      break;
    case 'PATCH':
      app.patch(schema.path, ...(handlers as RequestHandler[]));
      break;
  }
};

const requestValidationErrorHandler = (
  handler: TsRestExpressOptions<any>['requestValidationErrorHandler'] = 'default',
) => {
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof RequestValidationError) {
      // old-style error handling, kept for backwards compatibility
      if (handler === 'default') {
        if (err.pathParams) {
          return res.status(400).json(err.pathParams);
        }
        if (err.headers) {
          return res.status(400).json(err.headers);
        }
        if (err.query) {
          return res.status(400).json(err.query);
        }
        if (err.body) {
          return res.status(400).json(err.body);
        }
      } else if (handler === 'combined') {
        return res.status(400).json({
          pathParameterErrors: err.pathParams,
          headerErrors: err.headers,
          queryParameterErrors: err.query,
          bodyErrors: err.body,
        });
      } else {
        return handler(err, req as any, res, next);
      }
    }

    next(err);
  };
};

export const createExpressEndpoints = <TRouter extends AppRouter>(
  schema: TRouter,
  router: RouterImplementation<TRouter>,
  app: IRouter,
  options: TsRestExpressOptions<TRouter> = {
    logInitialization: true,
    jsonQuery: false,
    responseValidation: false,
    requestValidationErrorHandler: 'default',
  },
) => {
  recursivelyApplyExpressRouter({
    schema,
    router,
    processRoute: (implementation, innerSchema) => {
      initializeExpressRoute({
        implementationOrOptions:
          implementation as AppRouteImplementationOrOptions<AppRoute>,
        schema: innerSchema,
        app,
        options,
      });
    },
  });

  app.use(requestValidationErrorHandler(options.requestValidationErrorHandler));
};
