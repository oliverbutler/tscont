import { Reflector } from '@nestjs/core';
import { mergeMap, Observable } from 'rxjs';
import type { Request, Response } from 'express-serve-static-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  All,
  applyDecorators,
  BadRequestException,
  CallHandler,
  Delete,
  ExecutionContext,
  Get,
  HttpException,
  HttpExceptionOptions,
  Inject,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  NotFoundException,
  Optional,
  Patch,
  Post,
  Put,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import {
  AppRoute,
  AppRouter,
  checkZodSchema,
  isAppRoute,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  ServerInferResponses,
  TsRestResponseError,
  ZodErrorSchema,
} from '@ts-rest/core';
import {
  TsRestAppRouteMetadataKey,
  TsRestOptionsMetadataKey,
} from './constants';
import { TsRestRequestShape } from './ts-rest-request.decorator';
import { z } from 'zod';
import { TS_REST_MODULE_OPTIONS_TOKEN } from './ts-rest.module';
import {
  evaluateTsRestOptions,
  MaybeTsRestOptions,
  TsRestOptions,
} from './ts-rest-options';

export class RequestValidationError extends BadRequestException {
  constructor(
    public pathParams: z.ZodError | null,
    public headers: z.ZodError | null,
    public query: z.ZodError | null,
    public body: z.ZodError | null,
  ) {
    super({
      paramsResult: pathParams,
      headersResult: headers,
      queryResult: query,
      bodyResult: body,
    });
  }
}

export const RequestValidationErrorSchema = z.object({
  paramsResult: ZodErrorSchema.nullable(),
  headersResult: ZodErrorSchema.nullable(),
  queryResult: ZodErrorSchema.nullable(),
  bodyResult: ZodErrorSchema.nullable(),
});

export class ResponseValidationError extends InternalServerErrorException {
  constructor(
    public appRoute: AppRoute,
    public error: z.ZodError,
  ) {
    super(
      `[ts-rest] Response validation failed for ${appRoute.method} ${appRoute.path}: ${error.message}`,
    );
  }
}

export const TsRestHandler = (
  appRouterOrRoute: AppRouter | AppRoute,
  options?: TsRestOptions,
): MethodDecorator => {
  const decorators = [];

  if (options) {
    decorators.push(SetMetadata(TsRestOptionsMetadataKey, options));
  }

  const isMultiHandler = !isAppRoute(appRouterOrRoute);

  if (isMultiHandler) {
    const routerPaths: Set<string> = new Set();

    Object.values(appRouterOrRoute).forEach((value) => {
      if (isAppRoute(value)) {
        routerPaths.add(value.path);
      }
    });

    const routerPathsArray = Array.from(routerPaths);

    decorators.push(
      All(routerPathsArray),
      SetMetadata(TsRestAppRouteMetadataKey, appRouterOrRoute),
      UseInterceptors(TsRestHandlerInterceptor),
    );
  } else {
    const apiDecorator = (() => {
      switch (appRouterOrRoute.method) {
        case 'GET':
          return Get(appRouterOrRoute.path);
        case 'POST':
          return Post(appRouterOrRoute.path);
        case 'PUT':
          return Put(appRouterOrRoute.path);
        case 'PATCH':
          return Patch(appRouterOrRoute.path);
        case 'DELETE':
          return Delete(appRouterOrRoute.path);
      }
    })();

    decorators.push(
      apiDecorator,
      SetMetadata(TsRestAppRouteMetadataKey, appRouterOrRoute),
      UseInterceptors(TsRestHandlerInterceptor),
    );
  }

  return applyDecorators(...decorators);
};

type NestHandlerImplementation<T extends AppRouter | AppRoute> =
  T extends AppRoute
    ? (args: TsRestRequestShape<T>) => Promise<ServerInferResponses<T>>
    : {
        [K in keyof T]: T[K] extends AppRoute
          ? (
              args: TsRestRequestShape<T[K]>,
            ) => Promise<ServerInferResponses<T[K]>>
          : never;
      };

/**
 *
 * @param contract - The contract or route to implement
 * @param implementation - Implementation of the route or entire contract as an object
 * @returns
 */
export const tsRestHandler = <T extends AppRouter | AppRoute>(
  contract: T,
  implementation: NestHandlerImplementation<T>,
) => implementation;

/**
 * Error you can throw to return a response from a handler
 */
export class TsRestException<T extends AppRoute> extends HttpException {
  constructor(
    route: T,
    response: ServerInferResponses<T>,
    options?: HttpExceptionOptions,
  ) {
    super(response.body as Record<string, any>, response.status, options);
  }
}

export const doesUrlMatchContractPath = (
  /**
   * @example '/posts/:id'
   */
  contractPath: string,
  /**
   * @example '/posts/1'
   */
  url: string,
): boolean => {
  // strip trailing slash
  if (contractPath !== '/' && contractPath.endsWith('/')) {
    contractPath = contractPath.slice(0, -1);
  }

  if (url !== '/' && url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  const contractPathParts = contractPath.split('/').filter(Boolean);
  const urlParts = url.split('/').filter(Boolean);

  let urlIndex = 0;
  let contractIndex = 0;

  while (contractIndex < contractPathParts.length) {
    const contractPart = contractPathParts[contractIndex];
    const urlPart = urlParts[urlIndex];

    // If it's an optional parameter
    if (contractPart.endsWith('?')) {
      // If we have a matching URL part, consume it
      if (urlPart) {
        urlIndex++;
      }
      contractIndex++;
      continue;
    }

    // If it's a required parameter or static part
    if (!urlPart) {
      // If we're missing a required part
      if (!contractPart.startsWith(':') || !contractPart.endsWith('?')) {
        return false;
      }
    }

    // For both static parts and parameters
    if (urlPart) {
      // For static parts, they must match exactly
      if (!contractPart.startsWith(':') && contractPart !== urlPart) {
        return false;
      }
      urlIndex++;
    }

    contractIndex++;
  }

  // Make sure we've consumed all URL parts
  return urlIndex === urlParts.length;
};

@Injectable()
export class TsRestHandlerInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(TS_REST_MODULE_OPTIONS_TOKEN)
    private globalOptions: MaybeTsRestOptions,
  ) {}

  private getAppRouteFromContext(ctx: ExecutionContext) {
    const req: Request | FastifyRequest = ctx.switchToHttp().getRequest();

    const appRoute = this.reflector.get<AppRoute | AppRouter | undefined>(
      TsRestAppRouteMetadataKey,
      ctx.getHandler(),
    );

    if (!appRoute) {
      throw new Error(
        'Could not find app router or app route, ensure you are using the @TsRestHandler decorator on your method',
      );
    }

    if (isAppRoute(appRoute)) {
      return {
        appRoute,
        routeAlias: undefined,
      };
    }

    const appRouter = appRoute;

    const foundAppRoute = Object.entries(appRouter).find(([, value]) => {
      if (isAppRoute(value)) {
        return (
          doesUrlMatchContractPath(
            value.path,
            'path' in req ? req.path : req.routeOptions.url!,
          ) && req.method === value.method
        );
      }

      return null;
    }) as [string, AppRoute] | undefined;

    if (!foundAppRoute) {
      throw new NotFoundException("Couldn't find route handler for this path");
    }

    return {
      appRoute: foundAppRoute[1],
      routeKey: foundAppRoute[0],
    };
  }

  intercept(ctx: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const res: Response | FastifyReply = ctx.switchToHttp().getResponse();
    const req: Request | FastifyRequest = ctx.switchToHttp().getRequest();

    const { appRoute, routeKey } = this.getAppRouteFromContext(ctx);

    const options = evaluateTsRestOptions(this.globalOptions, ctx);

    const paramsResult = checkZodSchema(req.params, appRoute.pathParams, {
      passThroughExtraKeys: true,
    });

    const headersResult = checkZodSchema(req.headers, appRoute.headers, {
      passThroughExtraKeys: true,
    });

    const query = options.jsonQuery
      ? parseJsonQueryObject(req.query as Record<string, string>)
      : req.query;

    const queryResult = checkZodSchema(query, appRoute.query);

    const bodyResult = checkZodSchema(
      req.body,
      'body' in appRoute ? appRoute.body : null,
    );

    const isHeadersInvalid =
      !headersResult.success && options.validateRequestHeaders;

    const isQueryInvalid = !queryResult.success && options.validateRequestQuery;

    const isBodyInvalid = !bodyResult.success && options.validateRequestBody;

    if (
      !paramsResult.success ||
      isHeadersInvalid ||
      isQueryInvalid ||
      isBodyInvalid
    ) {
      throw new RequestValidationError(
        !paramsResult.success ? paramsResult.error : null,
        isHeadersInvalid ? headersResult.error : null,
        isQueryInvalid ? queryResult.error : null,
        isBodyInvalid ? bodyResult.error : null,
      );
    }

    return next.handle().pipe(
      mergeMap(async (impl) => {
        let result = null;
        try {
          const res = {
            params: paramsResult.data,
            query: queryResult.success ? queryResult.data : req.query,
            body: bodyResult.success ? bodyResult.data : req.body,
            headers: headersResult.success ? headersResult.data : req.headers,
          };

          result = routeKey ? await impl[routeKey](res) : await impl(res);
        } catch (e) {
          if (e instanceof TsRestException) {
            result = {
              status: e.getStatus(),
              body: e.getResponse(),
              error: e,
            };
          } else if (e instanceof TsRestResponseError) {
            result = {
              status: e.statusCode,
              body: e.body,
            };
          } else {
            throw e;
          }
        }

        const responseAfterValidation = options.validateResponses
          ? validateResponse(appRoute, result)
          : result;

        const responseType = appRoute.responses[result.status];

        if (result.error) {
          throw new HttpException(
            responseAfterValidation.body,
            responseAfterValidation.status,
            {
              cause: result.error,
            },
          );
        }

        if (isAppRouteOtherResponse(responseType)) {
          if ('setHeader' in res) {
            res.setHeader('content-type', responseType.contentType);
          } else {
            res.header('content-type', responseType.contentType);
          }
        }

        res.status(responseAfterValidation.status);
        return responseAfterValidation.body;
      }),
    );
  }
}

const validateResponse = (
  appRoute: AppRoute,
  response: { status: number; body?: unknown },
): { body: unknown; status: number } => {
  const { body } = response;

  const responseType = appRoute.responses[response.status];
  const responseSchema = isAppRouteOtherResponse(responseType)
    ? responseType.body
    : responseType;

  if (!responseSchema) {
    throw new InternalServerErrorException(
      `[ts-rest] Couldn't find a response schema for ${response.status} on route ${appRoute.path}`,
    );
  }

  const responseValidation = checkZodSchema(
    body,
    appRoute.responses[response.status],
  );

  if (!responseValidation.success) {
    const { error } = responseValidation;

    throw new ResponseValidationError(appRoute, error);
  }

  return {
    status: response.status,
    body: responseValidation.data,
  };
};
