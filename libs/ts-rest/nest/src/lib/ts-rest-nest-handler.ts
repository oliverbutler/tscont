import { Reflector } from '@nestjs/core';
import { mergeMap, Observable } from 'rxjs';
import type { Request, Response } from 'express-serve-static-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
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

type TsRestAppRouteMetadata = {
  appRoute: AppRoute;
  /**
   * if we're in a multi handler, this is the key of the route e.g. `getHello`
   * inside a contract with multiple handlers
   *
   * Otherwise, it's null, i.e. single handler
   */
  routeKey: string | null;
};

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

const getHttpVerbDecorator = (route: AppRoute) => {
  switch (route.method) {
    case 'GET':
      return Get(route.path);
    case 'POST':
      return Post(route.path);
    case 'PUT':
      return Put(route.path);
    case 'PATCH':
      return Patch(route.path);
    case 'DELETE':
      return Delete(route.path);
  }
};

export const TsRestHandler = (
  appRouterOrRoute: AppRouter | AppRoute,
  options?: TsRestOptions,
): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const isMultiHandler = !isAppRoute(appRouterOrRoute);

    /**
     * To make multi handler work we've got to do a trick with virtual methods in the class:
     *
     * Originally we used the @All decorator on the original method, but this has issues with different controllers conflicting
     *
     * Now, we make a new method for each route in the router, and apply the appropriate decorator to it.
     *
     * e.g. say there is a contract with two methods, `getPost` and `updatePost`
     *
     * we create two new methods in the class, `handler_getPost` and `handler_updatePost`
     * and decorate @Get on the first and @Put on the second
     *
     * Then, we call the original method from the new method
     */
    if (isMultiHandler) {
      const originalMethod = descriptor.value;

      Object.entries(appRouterOrRoute).forEach(([routeKey, route]) => {
        if (isAppRoute(route)) {
          const methodName = `${String(propertyKey)}_${routeKey}`;

          // Create new method that calls original
          target[methodName] = async function (...args: any[]) {
            return originalMethod.apply(this, args);
          };

          // Get all metadata keys from the original method
          const reflector = new Reflector();
          const metadataKeys = Reflect.getMetadataKeys(descriptor.value);

          const HttpVerbDecorator = getHttpVerbDecorator(route);
          HttpVerbDecorator(
            target,
            methodName,
            Object.getOwnPropertyDescriptor(target, methodName)!,
          );

          // Copy all original method's metadata to the new method
          metadataKeys.forEach((key) => {
            const metadata = reflector.get(key, descriptor.value);
            if (metadata) {
              SetMetadata(key, metadata)(
                target,
                methodName,
                Object.getOwnPropertyDescriptor(target, methodName)!,
              );
            }
          });

          if (options) {
            SetMetadata(TsRestOptionsMetadataKey, options)(
              target,
              methodName,
              Object.getOwnPropertyDescriptor(target, methodName)!,
            );
          }

          SetMetadata(TsRestAppRouteMetadataKey, {
            appRoute: route,
            routeKey,
          } satisfies TsRestAppRouteMetadata)(
            target,
            methodName,
            Object.getOwnPropertyDescriptor(target, methodName)!,
          );

          UseInterceptors(TsRestHandlerInterceptor)(
            target,
            methodName,
            Object.getOwnPropertyDescriptor(target, methodName)!,
          );
        }
      });

      return descriptor;
    } else {
      /**
       * On the single handler we can just apply the HttpVerb decorator to the original method
       */
      if (!isAppRoute(appRouterOrRoute)) {
        throw new Error('Expected app route but received app router');
      }

      const HttpVerbDecorator = getHttpVerbDecorator(appRouterOrRoute);
      HttpVerbDecorator(target, propertyKey, descriptor);

      if (options) {
        SetMetadata(TsRestOptionsMetadataKey, options)(
          target,
          propertyKey,
          descriptor,
        );
      }

      SetMetadata(TsRestAppRouteMetadataKey, {
        appRoute: appRouterOrRoute,
        routeKey: null,
      } satisfies TsRestAppRouteMetadata)(target, propertyKey, descriptor);
      UseInterceptors(TsRestHandlerInterceptor)(
        target,
        propertyKey,
        descriptor,
      );

      return descriptor;
    }
  };
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

@Injectable()
export class TsRestHandlerInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(TS_REST_MODULE_OPTIONS_TOKEN)
    private globalOptions: MaybeTsRestOptions,
  ) {}

  /**
   * We use metadata to store the route, and the key of the route in a router on a given method
   */
  private getAppRouteFromContext(
    ctx: ExecutionContext,
  ): TsRestAppRouteMetadata {
    const appRouteMetadata = this.reflector.get<
      TsRestAppRouteMetadata | undefined
    >(TsRestAppRouteMetadataKey, ctx.getHandler());

    if (!appRouteMetadata) {
      throw new Error(
        'Could not find app router or app route, ensure you are using the @TsRestHandler decorator on your method',
      );
    }

    if (!isAppRoute(appRouteMetadata.appRoute)) {
      throw new Error('Expected app route but received app router');
    }

    return appRouteMetadata;
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

          /**
           * If we have a routeKey that means we're in a multi handler, and therefore we
           * need to call the appropriate method WITHIN the implementation object
           */
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
