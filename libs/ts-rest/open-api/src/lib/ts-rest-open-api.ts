import {
  AppRoute,
  AppRouter,
  extractZodObjectShape,
  isAppRoute,
  isAppRouteOtherResponse,
  isZodObject,
  isZodType,
} from '@ts-rest/core';
import {
  ExamplesObject,
  InfoObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  PathsObject,
  SchemaObject,
} from 'openapi3-ts';
import { generateSchema } from '@anatine/zod-openapi';
import { z } from 'zod';

type RouterPath = {
  id: string;
  path: string;
  route: AppRoute;
  paths: string[];
};

const getPathsFromRouter = (
  router: AppRouter,
  pathHistory?: string[],
): RouterPath[] => {
  const paths: RouterPath[] = [];

  Object.keys(router).forEach((key) => {
    const value = router[key];

    if (isAppRoute(value)) {
      const pathWithPathParams = value.path.replace(/:(\w+)/g, '{$1}');

      paths.push({
        id: key,
        path: pathWithPathParams,
        route: value,
        paths: pathHistory ?? [],
      });
    } else {
      paths.push(...getPathsFromRouter(value, [...(pathHistory ?? []), key]));
    }
  });

  return paths;
};

const getOpenApiSchemaFromZod = (zodType: unknown, useOutput = false) => {
  if (!isZodType(zodType)) {
    return null;
  }

  return generateSchema(zodType, useOutput);
};

const getPathParameters = (path: string, zodObject?: unknown) => {
  const isZodObj = isZodObject(zodObject);
  const zodShape = isZodObj ? extractZodObjectShape(zodObject) : {};

  const paramsFromPath = path
    .match(/{[^}]+}/g)
    ?.map((param) => param.slice(1, -1))
    .filter((param) => {
      return zodShape[param] === undefined;
    });

  const params: any[] =
    paramsFromPath?.map((param) => ({
      name: param,
      in: 'path' as const,
      required: true,
      schema: {
        type: 'string',
      },
    })) || [];

  if (isZodObj) {
    const paramsFromZod = Object.entries(zodShape).map(([key, value]) => {
      const { description, ...schema } = getOpenApiSchemaFromZod(value)!;
      return {
        name: key,
        in: 'path' as const,
        required: true,
        schema,
        ...(description && { description }),
      };
    });

    params.push(...paramsFromZod);
  }

  return params;
};

const getHeaderParameters = (zodObject?: unknown) => {
  const isZodObj = isZodObject(zodObject);

  if (!isZodObj) {
    return [];
  }

  const zodShape = extractZodObjectShape(zodObject);

  return Object.entries(zodShape).map(([key, value]) => {
    const schema = getOpenApiSchemaFromZod(value)!;
    const isRequired = !(value as z.ZodTypeAny).isOptional();

    return {
      name: key,
      in: 'header' as const,
      ...(isRequired && { required: true }),
      ...{
        schema: schema,
      },
    };
  });
};

const getQueryParametersFromZod = (zodObject: unknown, jsonQuery = false) => {
  const isZodObj = isZodObject(zodObject);

  if (!isZodObj) {
    return [];
  }

  const zodShape = extractZodObjectShape(zodObject);

  return Object.entries(zodShape).map(([key, value]) => {
    const {
      description,
      mediaExamples: examples,
      ...schema
    } = getOpenApiSchemaFromZod(value)!;
    const isObject = (obj: z.ZodTypeAny) => {
      while (obj._def.innerType) {
        obj = obj._def.innerType;
      }

      return obj._def.typeName === 'ZodObject';
    };
    const isRequired = !(value as z.ZodTypeAny).isOptional();

    return {
      name: key,
      in: 'query' as const,
      ...(description && { description }),
      ...(isRequired && { required: true }),
      ...(jsonQuery
        ? {
            content: {
              'application/json': {
                schema: schema,
                ...(examples && { examples }),
              },
            },
          }
        : {
            ...(isObject(value as z.ZodTypeAny) && {
              style: 'deepObject' as const,
            }),
            schema: schema,
          }),
    };
  });
};

declare module 'openapi3-ts' {
  interface SchemaObject {
    mediaExamples?: ExamplesObject;
  }
}

const convertSchemaObjectToMediaTypeObject = (
  input: SchemaObject,
): MediaTypeObject => {
  const { mediaExamples: examples, ...schema } = input;

  return {
    schema,
    ...(examples && { examples }),
  };
};

/**
 *
 * @param options.jsonQuery - Enable JSON query parameters, [see](/docs/open-api#json-query-params)
 * @returns
 */
export const generateOpenApi = (
  router: AppRouter,
  apiDoc: Omit<OpenAPIObject, 'paths' | 'openapi'> & { info: InfoObject },
  options: {
    setOperationId?: boolean | 'concatenated-path';
    jsonQuery?: boolean;
    operationMapper?: (
      operation: OperationObject,
      appRoute: AppRoute,
    ) => OperationObject;
  } = {},
): OpenAPIObject => {
  const paths = getPathsFromRouter(router);

  const mapMethod = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DELETE: 'delete',
    PATCH: 'patch',
  };

  const operationIds = new Map<string, string[]>();

  const pathObject = paths.reduce((acc, path) => {
    if (options.setOperationId === true) {
      const existingOp = operationIds.get(path.id);
      if (existingOp) {
        throw new Error(
          `Route '${path.id}' already defined under ${existingOp.join('.')}`,
        );
      }
      operationIds.set(path.id, path.paths);
    }

    const pathParams = getPathParameters(path.path, path.route.pathParams);
    const headerParams = getHeaderParameters(path.route.headers);

    const querySchema = getQueryParametersFromZod(
      path.route.query,
      !!options.jsonQuery,
    );

    const bodySchema =
      path.route?.method !== 'GET' && 'body' in path.route
        ? getOpenApiSchemaFromZod(path.route.body)
        : null;

    const responses = Object.entries(path.route.responses).reduce(
      (acc, [statusCode, response]) => {
        const isOtherResponse = isAppRouteOtherResponse(response);

        const body = isOtherResponse ? response.body : response;
        const contentType = isOtherResponse
          ? response.contentType
          : 'application/json';

        const responseSchema = getOpenApiSchemaFromZod(body, true);
        const description =
          isZodType(body) && body.description ? body.description : statusCode;

        return {
          ...acc,
          [statusCode]: {
            description,
            ...(responseSchema
              ? {
                  content: {
                    [contentType]: {
                      ...convertSchemaObjectToMediaTypeObject(responseSchema),
                    },
                  },
                }
              : {}),
          },
        };
      },
      {},
    );

    const contentType =
      path.route?.method !== 'GET' && 'contentType' in path.route
        ? path.route?.contentType ?? 'application/json'
        : 'application/json';

    const pathOperation: OperationObject = {
      description: path.route.description,
      summary: path.route.summary,
      deprecated: path.route.deprecated,
      tags: path.paths,
      parameters: [...pathParams, ...headerParams, ...querySchema],
      ...(options.setOperationId
        ? {
            operationId:
              options.setOperationId === 'concatenated-path'
                ? [...path.paths, path.id].join('.')
                : path.id,
          }
        : {}),
      ...(bodySchema
        ? {
            requestBody: {
              description: 'Body',
              content: {
                [contentType]: {
                  ...convertSchemaObjectToMediaTypeObject(bodySchema),
                },
              },
            },
          }
        : {}),
      responses,
    };

    acc[path.path] = {
      ...acc[path.path],
      [mapMethod[path.route.method]]: options.operationMapper
        ? options.operationMapper(pathOperation, path.route)
        : pathOperation,
    };

    return acc;
  }, {} as PathsObject);

  return {
    openapi: '3.0.2',
    paths: pathObject,
    ...apiDoc,
  };
};
