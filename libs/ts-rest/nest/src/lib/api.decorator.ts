import {
  applyDecorators,
  BadRequestException,
  CallHandler,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  Patch,
  Post,
  Put,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import {
  AppRoute,
  AppRouteMutation,
  checkZodSchema,
  parseJsonQueryObject,
  PathParamsWithCustomValidators,
  Without,
  ZodInferOrType,
  HTTPStatusCode,
} from '@ts-rest/core';
import { map, Observable } from 'rxjs';
import type { Request, Response } from 'express-serve-static-core';
import { JsonQuerySymbol } from './json-query.decorator';
import { ParseResponsesSymbol } from './parse-responses.decorator';

const tsRestAppRouteMetadataKey = Symbol('ts-rest-app-route');

type BodyWithoutFileIfMultiPart<T extends AppRouteMutation> =
  T['contentType'] extends 'multipart/form-data'
    ? Without<ZodInferOrType<T['body']>, File>
    : ZodInferOrType<T['body']>;

export type ApiDecoratorShape<TRoute extends AppRoute> = Without<
  {
    params: PathParamsWithCustomValidators<TRoute>;
    body: TRoute extends AppRouteMutation
      ? BodyWithoutFileIfMultiPart<TRoute>
      : never;
    query: ZodInferOrType<TRoute['query']>;
  },
  never
>;

export const ApiDecorator = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ApiDecoratorShape<any> => {
    const req: Request = ctx.switchToHttp().getRequest();
    const appRoute: AppRoute | undefined = Reflect.getMetadata(
      tsRestAppRouteMetadataKey,
      ctx.getHandler()
    );

    if (!appRoute) {
      // this will respond with a 500 error without revealing this error message in the response body
      throw new Error('Make sure your route is decorated with @Api()');
    }

    const isJsonQuery = !!(
      Reflect.getMetadata(JsonQuerySymbol, ctx.getHandler()) ||
      Reflect.getMetadata(JsonQuerySymbol, ctx.getClass())
    );

    const query = isJsonQuery
      ? parseJsonQueryObject(req.query as Record<string, string>)
      : req.query;

    const queryResult = checkZodSchema(query, appRoute.query);

    if (!queryResult.success) {
      throw new BadRequestException(queryResult.error);
    }

    const bodyResult = checkZodSchema(
      req.body,
      appRoute.method === 'GET' ? null : appRoute.body
    );

    if (!bodyResult.success) {
      throw new BadRequestException(bodyResult.error);
    }

    const pathParamsResult = checkZodSchema(req.params, appRoute.pathParams, {
      passThroughExtraKeys: true,
    });

    if (!pathParamsResult.success) {
      throw new BadRequestException(pathParamsResult.error);
    }

    return {
      query: queryResult.data,
      params: pathParamsResult.data,
      body: bodyResult.data,
    };
  }
);

const getMethodDecorator = (appRoute: AppRoute) => {
  switch (appRoute.method) {
    case 'DELETE':
      return Delete(appRoute.path);
    case 'GET':
      return Get(appRoute.path);
    case 'POST':
      return Post(appRoute.path);
    case 'PATCH':
      return Patch(appRoute.path);
    case 'PUT':
      return Put(appRoute.path);
  }
};

@Injectable()
export class ApiRouteInterceptor implements NestInterceptor {
  private isAppRouteResponse(
    value: unknown
  ): value is { status: HTTPStatusCode; body?: any } {
    return (
      value != null &&
      typeof value === 'object' &&
      'status' in value &&
      typeof value.status === 'number'
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res: Response = context.switchToHttp().getResponse();

    const appRoute: AppRoute | undefined = Reflect.getMetadata(
      tsRestAppRouteMetadataKey,
      context.getHandler()
    );

    if (!appRoute) {
      // this will respond with a 500 error without revealing this error message in the response body
      throw new Error('Make sure your route is decorated with @Api()');
    }

    return next.handle().pipe(
      map((value) => {
        if (this.isAppRouteResponse(value)) {
          const statusNumber = value.status;

          const isParsingEnabled = Boolean(
            Reflect.getMetadata(ParseResponsesSymbol, context.getHandler()) ||
              Reflect.getMetadata(ParseResponsesSymbol, context.getClass())
          );

          const responseValidation = checkZodSchema(
            value.body,
            isParsingEnabled ? appRoute.responses[statusNumber] : undefined
          );

          if (!responseValidation.success) {
            const { error } = responseValidation;

            const message = error.errors.map(
              (error) => `${error.path.join('.')}: ${error.message}`
            );

            throw new InternalServerErrorException(message);
          }

          res.status(statusNumber);
          return responseValidation.data;
        }

        return value;
      })
    );
  }
}

export const Api = (appRoute: AppRoute): MethodDecorator => {
  const methodDecorator = getMethodDecorator(appRoute);

  return applyDecorators(
    SetMetadata(tsRestAppRouteMetadataKey, appRoute),
    methodDecorator,
    UseInterceptors(ApiRouteInterceptor)
  );
};
