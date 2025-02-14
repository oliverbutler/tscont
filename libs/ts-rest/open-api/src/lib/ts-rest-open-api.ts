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
  ReferenceObject,
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

const extractReferenceSchemas = (
  schema: SchemaObject,
  referenceSchemas: { [id: string]: SchemaObject },
): SchemaObject => {
  if (schema.allOf) {
    schema.allOf = schema.allOf?.map((subSchema) =>
      extractReferenceSchemas(subSchema, referenceSchemas),
    );
  }

  if (schema.anyOf) {
    schema.anyOf = schema.anyOf?.map((subSchema) =>
      extractReferenceSchemas(subSchema, referenceSchemas),
    );
  }

  if (schema.oneOf) {
    schema.oneOf = schema.oneOf?.map((subSchema) =>
      extractReferenceSchemas(subSchema, referenceSchemas),
    );
  }

  if (schema.not) {
    schema.not = extractReferenceSchemas(schema.not, referenceSchemas);
  }

  if (schema.items) {
    schema.items = extractReferenceSchemas(schema.items, referenceSchemas);
  }

  if (schema.properties) {
    schema.properties = Object.entries(schema.properties).reduce<{
      [p: string]: SchemaObject | ReferenceObject;
    }>((prev, [propertyName, schema]) => {
      prev[propertyName] = extractReferenceSchemas(schema, referenceSchemas);
      return prev;
    }, {});
  }

  if (schema.additionalProperties) {
    schema.additionalProperties =
      typeof schema.additionalProperties != 'boolean'
        ? extractReferenceSchemas(schema.additionalProperties, referenceSchemas)
        : schema.additionalProperties;
  }

  if (schema.title) {
    const nullable = schema.nullable;
    schema.nullable = undefined;
    if (schema.title in referenceSchemas) {
      if (
        JSON.stringify(referenceSchemas[schema.title]) !==
        JSON.stringify(schema)
      ) {
        throw new Error(
          `Schema title '${schema.title}' already exists with a different schema`,
        );
      }
    } else {
      referenceSchemas[schema.title] = schema;
    }

    if (nullable) {
      schema = {
        nullable: true,
        allOf: [
          {
            $ref: `#/components/schemas/${schema.title}`,
          },
        ],
      };
    } else {
      schema = {
        $ref: `#/components/schemas/${schema.title}`,
      };
    }
  }
  return schema;
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

  const referenceSchemas: { [id: string]: SchemaObject } = {};

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

    let bodySchema =
      path.route?.method !== 'GET' && 'body' in path.route
        ? getOpenApiSchemaFromZod(path.route.body)
        : null;

    if (bodySchema?.title) {
      bodySchema = extractReferenceSchemas(bodySchema, referenceSchemas);
    }

    const responses = Object.entries(path.route.responses).reduce(
      (acc, [statusCode, response]) => {
        let contentType = 'application/json';
        let responseBody = response;

        if (isAppRouteOtherResponse(response)) {
          contentType = response.contentType;
          responseBody = response.body;
        }

        let responseSchema = getOpenApiSchemaFromZod(responseBody, true);
        const description =
          isZodType(responseBody) && responseBody.description
            ? responseBody.description
            : statusCode;

        if (responseSchema) {
          responseSchema = extractReferenceSchemas(
            responseSchema,
            referenceSchemas,
          );
        }

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

  if (Object.keys(referenceSchemas).length) {
    apiDoc['components'] = {
      schemas: {
        ...referenceSchemas,
      },
      ...apiDoc['components'],
    };
  }

  return {
    openapi: '3.0.2',
    paths: pathObject,
    ...apiDoc,
  };
};
