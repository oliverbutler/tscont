import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AppRoute,
  AppRouteQuery,
  AppRouter,
  checkStandardSchema,
  HTTPStatusCode,
  isAppRoute,
  isAppRouteNoBody,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  ServerInferRequest,
  ServerInferResponses,
  TsRestResponseError,
  validateResponse,
  ValidationError,
  ValidationErrorSchema,
} from '@ts-rest/core';
import { getPathParamsFromArray } from './path-utils';

export class RequestValidationError extends Error {
  constructor(
    public pathParams: ValidationError | null,
    public headers: ValidationError | null,
    public query: ValidationError | null,
    public body: ValidationError | null,
  ) {
    super('[ts-rest] request validation failed');
  }
}

export const RequestValidationErrorSchema: typeof ValidationErrorSchema =
  ValidationErrorSchema;

type AppRouteImplementation<T extends AppRoute> = (
  args: ServerInferRequest<T, NextApiRequest['headers']> & {
    req: NextApiRequest;
    res: NextApiResponse;
  },
) => Promise<ServerInferResponses<T>>;

export type RouterImplementation<T extends AppRouter> = {
  [TKey in keyof T]: T[TKey] extends AppRouter
    ? RouterImplementation<T[TKey]>
    : T[TKey] extends AppRoute
    ? AppRouteImplementation<T[TKey]>
    : never;
};

type AppRouteWithImplementation<T extends AppRouteQuery> = T &
  AppRouteImplementation<T>;

type AppRouterWithImplementation = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: AppRouterWithImplementation | AppRouteWithImplementation<any>;
};

type CreateNextRouterOptions = {
  jsonQuery?: boolean;
  responseValidation?: boolean;
  throwRequestValidation?: boolean;
  errorHandler?: (
    err: unknown,
    req: NextApiRequest,
    res: NextApiResponse,
  ) => void;
};

/**
 * Combine all AppRoutes with their implementations into a single object
 * which is easier to work with
 * @param router
 * @param implementation
 * @returns
 */
const mergeRouterAndImplementation = <T extends AppRouter>(
  router: T,
  implementation: RouterImplementation<T>,
): AppRouterWithImplementation => {
  const keys = Object.keys(router);

  return keys.reduce((acc, key) => {
    const existing = router[key];
    const existingImpl = implementation[key];

    if (isAppRoute(existing)) {
      acc[key] = { ...existing, implementation: existingImpl };
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      acc[key] = mergeRouterAndImplementation(existing, existingImpl);
    }
    return acc;
  }, {} as AppRouterWithImplementation);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isAppRouteWithImplementation = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): obj is AppRouteWithImplementation<any> => {
  return obj?.implementation !== undefined && obj?.method;
};

/**
 * Check whether the route is correct
 *
 * @param route
 * @param query
 * @param method
 * @returns
 */
const isRouteCorrect = (route: AppRoute, query: string[], method: string) => {
  const pathAsArray = route.path.split('/').slice(1);

  if (pathAsArray.length === query.length && route.method === method) {
    let matches = true;

    for (let i = 0; i < pathAsArray.length; i++) {
      const isCurrElementWildcard = pathAsArray[i].startsWith(':');

      if (!isCurrElementWildcard && pathAsArray[i] !== query[i]) {
        matches = false;
      }
    }

    return matches;
  }

  return false;
};

/**
 * Takes a completed app router (with implementations) and attempts to
 * match up the request to the correct route
 *
 * @param router
 * @param query
 * @param method
 * @returns
 */
const getRouteImplementation = (
  router: AppRouterWithImplementation,
  query: string[],
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): AppRouteWithImplementation<any> | null => {
  const keys = Object.keys(router);

  for (const key of keys) {
    const appRoute = router[key];

    if (isAppRouteWithImplementation(appRoute)) {
      if (isRouteCorrect(appRoute, query, method)) {
        return appRoute;
      }
    } else {
      const route = getRouteImplementation(appRoute, query, method);

      if (route) {
        return route;
      }
    }
  }

  return null;
};

/**
 * Create the implementation for a given AppRouter.
 *
 * @param appRouter - AppRouter
 * @param implementation - Implementation of the AppRouter, e.g. your API controllers
 * @returns
 */
export const createNextRoute = <T extends AppRouter | AppRoute>(
  appRouter: T,
  implementation: T extends AppRouter
    ? RouterImplementation<T>
    : T extends AppRoute
    ? AppRouteImplementation<T>
    : never,
) => implementation;

/**
 * Turn a completed set of Next routes into a Next.js compatible route.
 *
 * Should be exported from your [...ts-rest].tsx file.
 *
 * e.g.
 *
 * ```typescript
 * export default createNextRouter(contract, implementation);
 * ```
 *
 * @param routes
 * @param obj
 * @param options
 * @returns
 */
export const createNextRouter = <T extends AppRouter>(
  routes: T,
  obj: RouterImplementation<T>,
  options?: CreateNextRouterOptions,
) => {
  return handlerFactory((req) => {
    const combinedRouter = mergeRouterAndImplementation(routes, obj);

    // eslint-disable-next-line prefer-const
    let { 'ts-rest': params, ...query } = req.query;

    params = (params as string[]) || [];
    const route = getRouteImplementation(
      combinedRouter,
      params,
      req.method as string,
    );
    let pathParams;
    if (route) {
      pathParams = getPathParamsFromArray(params, route);
    } else {
      pathParams = {};
    }
    return { pathParams, query, route };
  }, options);
};

/**
 * Turn a contract route and a handler into a Next.js compatible handler
 * Should be exported from your pages/api/path/to/handler.tsx file.
 *
 * e.g.
 *
 * ```typescript
 * export default createNextRouter(contract, implementationHandler);
 * ```
 */
export function createSingleRouteHandler<T extends AppRoute>(
  appRoute: T,
  implementationHandler: AppRouteImplementation<T>,
  options?: CreateNextRouterOptions,
) {
  return handlerFactory((req) => {
    const route = { ...appRoute, implementation: implementationHandler };
    const urlChunks = req.url!.split('/').slice(1);
    const pathParams = getPathParamsFromArray(urlChunks, route);
    const query = req.query
      ? Object.fromEntries(
          Object.entries(req.query).filter(
            ([key]) => pathParams[key] === undefined,
          ),
        )
      : {};

    const isValidRoute = isRouteCorrect(
      appRoute,
      urlChunks,
      req.method as string,
    );

    return { pathParams, query, route: isValidRoute ? route : null };
  }, options);
}

/**
 * Create a next.js compatible handler for a given route
 * @param getArgumentsFromRequest
 * @param options
 * @returns
 */
const handlerFactory = (
  getArgumentsFromRequest: (req: NextApiRequest) => {
    pathParams: Record<string, string>;
    query: NextApiRequest['query'];
    route: AppRouterWithImplementation[keyof AppRouterWithImplementation];
  },
  options?: CreateNextRouterOptions,
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const {
      jsonQuery = false,
      responseValidation = false,
      throwRequestValidation = false,
    } = options || {};

    const args = getArgumentsFromRequest(req);
    const { pathParams, route } = args;
    let { query } = args;
    if (!route) {
      res.status(404).end();
      return;
    }

    const pathParamsResult = checkStandardSchema(pathParams, route.pathParams, {
      passThroughExtraKeys: true,
    });

    const headersResult = checkStandardSchema(req.headers, route.headers, {
      passThroughExtraKeys: true,
    });

    query = jsonQuery
      ? parseJsonQueryObject(query as Record<string, string>)
      : req.query;

    const queryResult = checkStandardSchema(query, route.query);

    const bodyResult = checkStandardSchema(req.body, route.body);

    try {
      if (
        pathParamsResult.error ||
        headersResult.error ||
        queryResult.error ||
        bodyResult.error
      ) {
        if (throwRequestValidation) {
          throw new RequestValidationError(
            pathParamsResult.error || null,
            headersResult.error || null,
            queryResult.error || null,
            bodyResult.error || null,
          );
        }

        if (pathParamsResult.error) {
          return res.status(400).json(pathParamsResult.error);
        }
        if (headersResult.error) {
          return res.status(400).send(headersResult.error);
        }
        if (queryResult.error) {
          return res.status(400).json(queryResult.error);
        }
        if (bodyResult.error) {
          return res.status(400).json(bodyResult.error);
        }
      }

      let result: { status: HTTPStatusCode; body: any };
      try {
        result = await route.implementation({
          body: bodyResult.value,
          query: queryResult.value,
          params: pathParamsResult.value,
          headers: headersResult.value,
          req,
          res,
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

      let validatedResponseBody = result.body;

      if (responseValidation) {
        const response = validateResponse({
          appRoute: route,
          response: {
            status: statusCode,
            body: result.body,
          },
        });

        validatedResponseBody = response.body;
      }

      const responseType = route.responses[statusCode];

      if (isAppRouteNoBody(responseType)) {
        return res.status(statusCode).end();
      }

      if (isAppRouteOtherResponse(responseType)) {
        res.setHeader('content-type', responseType.contentType);
        return res.status(statusCode).send(validatedResponseBody);
      }

      return res.status(statusCode).json(validatedResponseBody);
    } catch (e) {
      if (options?.errorHandler) {
        options.errorHandler(e, req, res);
        return;
      }

      throw e;
    }
  };
};
