import {
  AppRoute,
  AppRouter,
  isAppRoute,
  isAppRouteNoBody,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  ResponseValidationError as ResponseValidationErrorCore,
  validateResponse,
  HTTPStatusCode,
  TsRestResponseError,
  checkStandardSchema,
} from '@ts-rest/core';
import { Router, withParams, cors } from 'itty-router';
import { TsRestRequest } from './request';
import { TsRestResponse } from './response';
import {
  AppRouteImplementationOrOptions,
  isAppRouteImplementation,
  isRouterImplementation,
  RouterImplementation,
  RequestValidationError,
  ResponseValidationError,
  ServerlessHandlerOptions,
  RouterImplementationOrFluentRouter,
} from './types';
import { blobToArrayBuffer } from './utils';
import { TsRestHttpError } from './http-error';
import { RouterBuilder } from './router-builder';

const recursivelyProcessContract = ({
  schema,
  router,
  processRoute,
}: {
  schema: AppRouter | AppRoute;
  router:
    | RouterImplementation<any, any, any>
    | AppRouteImplementationOrOptions<any, any, any>;
  processRoute: (
    implementationOrOptions: AppRouteImplementationOrOptions<
      AppRoute,
      any,
      any
    >,
    schema: AppRoute,
  ) => void;
}): void => {
  if (isRouterImplementation(router)) {
    for (const key in router) {
      if (isAppRoute(schema)) {
        throw new Error(`[ts-rest] Expected AppRouter but received AppRoute`);
      }

      recursivelyProcessContract({
        schema: schema[key],
        router: router[key],
        processRoute,
      });
    }
  } else {
    if (!isAppRoute(schema)) {
      throw new Error(`[ts-rest] Expected AppRoute but received AppRouter`);
    }

    processRoute(router, schema);
  }
};

const validateRequest = <TPlatformArgs, TRequestExtension>(
  req: TsRestRequest,
  schema: AppRoute,
  options: ServerlessHandlerOptions<TPlatformArgs, TRequestExtension>,
) => {
  const paramsResult = checkStandardSchema(req.params, schema.pathParams, {
    passThroughExtraKeys: true,
  });

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const headersResult = checkStandardSchema(headers, schema.headers, {
    passThroughExtraKeys: true,
  });

  const queryResult = checkStandardSchema(
    options.jsonQuery
      ? parseJsonQueryObject(req.query as Record<string, string>)
      : req.query,
    schema.query,
  );

  const bodyResult = checkStandardSchema(
    req.content,
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

const tsRestMiddleware = <TPlatformArgs, TRequestExtension>(
  options: ServerlessHandlerOptions<TPlatformArgs, TRequestExtension>,
) => {
  const { preflight: ittyPreflight, corsify: ittyCorsify } = cors(
    options.cors || {},
  );

  const basePath = options.basePath ?? '';
  const basePathChecker = (request: TsRestRequest) => {
    const pathname = new URL(request.url).pathname;

    if (!pathname.startsWith(basePath)) {
      throw new Error(
        `Expected path to start with the basePath of ${basePath}, but got a path of ${pathname}`,
      );
    }
  };

  type RequestWithPreflightContext = TsRestRequest & {
    preflightCorsHeadersSet: boolean;
  };

  const preflight = (request: TsRestRequest): TsRestResponse | void => {
    const preflightResult = ittyPreflight(request);
    if (preflightResult) {
      (request as RequestWithPreflightContext).preflightCorsHeadersSet = true;
      return new TsRestResponse(null, preflightResult);
    }
  };

  const corsify = (response: TsRestResponse, request: TsRestRequest) => {
    if (!(request as RequestWithPreflightContext).preflightCorsHeadersSet) {
      return ittyCorsify(response, request);
    }
    return response;
  };

  const varyHeader = (response: TsRestResponse, request: TsRestRequest) => {
    if (options.cors) {
      // if no specific allowHeaders are, we need to set Vary: Access-Control-Request-Headers because
      // access-control-allow-headers is set to whatever the request access-control-request-headers is set to
      if (request.method === 'OPTIONS' && !options.cors.allowHeaders) {
        response.headers.append('vary', 'Access-Control-Request-Headers');
      }

      // if cors options origin is not a static string, we need to set Vary: Origin
      // because the response header of Access-Control-Allow-Origin will be dynamic based on the request origin
      if (
        options.cors.origin === true ||
        options.cors.origin instanceof RegExp ||
        Array.isArray(options.cors.origin) ||
        options.cors.origin instanceof Function ||
        // if credentials is true, the origin is not set as '*' but the request origin itself
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials
        (options.cors.origin === '*' && options.cors.credentials)
      ) {
        response.headers.append('vary', 'Origin');
      }
    }
  };

  const evaluateContent = async (request: TsRestRequest) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (request.headers.get('content-type')?.includes('json')) {
        request['content'] = await request.json();
      } else if (request.headers.get('content-type')?.startsWith('text/')) {
        request['content'] = await request.text();
      }
    }
  };

  return {
    basePathChecker,
    varyHeader,
    evaluateContent,
    preflight,
    corsify,
  };
};

export const createServerlessRouter = <
  T extends AppRouter,
  TPlatformArgs,
  TRequestExtension,
>(
  routes: T,
  obj: RouterImplementationOrFluentRouter<T, TPlatformArgs, TRequestExtension>,
  options: ServerlessHandlerOptions<TPlatformArgs, TRequestExtension> = {},
) => {
  const { basePathChecker, varyHeader, evaluateContent, preflight, corsify } =
    tsRestMiddleware(options);

  let requestMiddleware = options.requestMiddleware ?? [];
  let responseHandlers = options.responseHandlers ?? [];
  let routerImplementation: RouterImplementation<
    T,
    TPlatformArgs,
    TRequestExtension
  >;

  if (obj instanceof RouterBuilder) {
    requestMiddleware = obj.getRequestMiddleware();
    responseHandlers = obj.getResponseHandlers();
    routerImplementation = obj.build();
  } else {
    routerImplementation = obj;
  }

  const router = Router<TsRestRequest & TRequestExtension, [TPlatformArgs]>({
    before: [
      ...(options.basePath ? [basePathChecker] : []),
      ...(options.cors ? [preflight] : []),
      withParams,
      evaluateContent,
      ...requestMiddleware,
    ],
    catch: errorHandler(options),
    finally: [
      ...(options.cors ? [corsify, varyHeader] : []),
      ...responseHandlers,
    ],
  });

  recursivelyProcessContract({
    schema: routes,
    router: routerImplementation,
    processRoute: (implementationOrOptions, appRoute) => {
      const routeHandler = async (
        request: TsRestRequest,
        platformArgs: TPlatformArgs,
      ) => {
        const validationResults = validateRequest(request, appRoute, options);

        const responseHeaders = new Headers();
        const implementation = isAppRouteImplementation(implementationOrOptions)
          ? implementationOrOptions
          : implementationOrOptions.handler;

        let result: { status: HTTPStatusCode; body: any };
        try {
          result = await implementation(
            {
              params: validationResults.paramsResult.value as any,
              body: validationResults.bodyResult.value as any,
              query: validationResults.queryResult.value as any,
              headers: validationResults.headersResult.value as any,
            },
            {
              appRoute,
              request,
              responseHeaders,
              ...platformArgs,
            },
          );
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

        if (options.responseValidation) {
          try {
            const response = validateResponse({
              appRoute,
              response: {
                status: statusCode,
                body: result.body,
              },
            });

            validatedResponseBody = response.body;
          } catch (e) {
            if (e instanceof ResponseValidationErrorCore) {
              throw new ResponseValidationError(appRoute, e.cause);
            }

            throw e;
          }
        }

        const responseType = appRoute.responses[statusCode];

        if (isAppRouteNoBody(responseType)) {
          return new TsRestResponse(null, {
            status: statusCode,
            headers: responseHeaders,
          });
        }

        if (isAppRouteOtherResponse(responseType)) {
          if (validatedResponseBody instanceof Blob) {
            responseHeaders.set(
              'content-type',
              validatedResponseBody.type || responseType.contentType,
            );

            validatedResponseBody = await blobToArrayBuffer(
              validatedResponseBody,
            );
          } else {
            responseHeaders.set('content-type', responseType.contentType);
          }

          return new TsRestResponse(validatedResponseBody, {
            status: statusCode,
            headers: responseHeaders,
          });
        }

        return TsRestResponse.fromJson(validatedResponseBody, {
          status: statusCode,
          headers: responseHeaders,
        });
      };

      const routerMethod = appRoute.method.toLowerCase();

      const handlers =
        !isAppRouteImplementation(implementationOrOptions) &&
        implementationOrOptions.middleware
          ? implementationOrOptions.middleware
          : [];

      handlers.push(routeHandler);

      router[routerMethod].apply(router, [
        `${options.basePath ?? ''}${appRoute.path}`,
        ...handlers,
      ]);
    },
  });

  router.all('*', () => {
    throw new TsRestHttpError(404, { message: 'Not Found' });
  });

  return router;
};

const errorHandler =
  <TPlatformArgs, TRequestExtension>(
    options: ServerlessHandlerOptions<TPlatformArgs, TRequestExtension>,
  ) =>
  async (error: unknown, request: TsRestRequest) => {
    if (options?.errorHandler) {
      const maybeResponse = await options.errorHandler(error, request);

      if (maybeResponse) {
        return maybeResponse;
      }
    } else if (!(error instanceof TsRestHttpError)) {
      console.error(
        '[ts-rest] Unexpected error...',
        error instanceof Error && error.stack ? error.stack : error,
      );
    }

    const httpError =
      error instanceof TsRestHttpError
        ? error
        : new TsRestHttpError(500, { message: 'Server Error' });

    const isJson = httpError.contentType?.includes('json');

    return new TsRestResponse(
      isJson ? JSON.stringify(httpError.body) : httpError.body,
      {
        status: httpError.statusCode,
        headers: httpError.contentType
          ? new Headers({
              'content-type': httpError.contentType,
            })
          : undefined,
      },
    );
  };
