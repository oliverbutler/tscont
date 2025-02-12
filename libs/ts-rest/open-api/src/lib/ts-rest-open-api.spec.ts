import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { generateOpenApi } from './ts-rest-open-api';
import { extendApi } from '@anatine/zod-openapi';
import { SecurityRequirementObject } from 'openapi3-ts';

const c = initContract();

type Post = {
  title: string;
  published: boolean;
};

const commentSchema = z.object({
  id: z.number(),
  title: z.string(),
});

const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    responses: {
      200: c.type<Post | null>(),
    },
  },
  findPosts: {
    method: 'GET',
    path: `/posts`,
    query: z.object({
      search: z.string().nullish(),
      sortBy: z.enum(['title', 'date']).default('date').optional(),
      sort: z.enum(['asc', 'desc']).default('asc').optional(),
      obj: z.object({
        a: z.string(),
      }),
    }),
    responses: {
      200: c.type<Post[]>(),
    },
  },
  createPost: {
    method: 'POST',
    path: '/posts',
    deprecated: true,
    responses: {
      200: c.type<Post>(),
    },
    body: z.object({
      title: z.string(),
      published: z.boolean().optional(),
    }),
  },
  comments: c.router({
    getPostComments: {
      method: 'GET',
      path: '/posts/:id/comments',
      responses: {
        200: z
          .object({
            booleanString: z.boolean().transform((v) => v.toString()),
            comments: z.union([
              z.array(commentSchema),
              z.array(commentSchema.extend({ author: z.string() })),
            ]),
          })
          .describe('Post comments'),
      },
    },
  }),
  getPostComment: {
    method: 'GET',
    path: `/posts/:id/comments/:commentId`,
    pathParams: z.object({
      commentId: z.string().length(5).describe('the comment ID'),
    }),
    responses: {
      200: c.type<Post | null>(),
    },
  },
  auth: {
    method: 'POST',
    path: '/auth',
    deprecated: undefined,
    responses: {
      200: c.type<string>(),
    },
    headers: z.object({
      'x-client-id': z.string(),
      'x-api-key': z.string(),
      'x-tenant-id': z.string().optional(),
    }),
    body: z.never(),
  },
});

const router = c.router({
  posts: postsRouter,
  health: {
    method: 'GET',
    path: '/health',
    summary: 'Health API',
    description: `Check the application's health status`,
    responses: {
      200: c.type<{ message: string }>(),
    },
    metadata: {
      openApiTags: ['Custom Health Tag'],
      openApiSecurity: [
        {
          BasicAuth: [],
        },
      ],
    },
  },
  mediaExamples: {
    method: 'POST',
    path: '/media-examples',
    query: z.object({
      foo: extendApi(z.string(), {
        // this will only be added when jsonQuery is enabled
        mediaExamples: {
          one: { value: 'foo' },
          two: { value: 'bar' },
        },
      }),
    }),
    summary: 'Examples API',
    description: `Check that examples can be added to body and response types`,
    body: extendApi(z.object({ id: z.string() }), {
      mediaExamples: {
        one: { value: { id: 'foo' } },
        two: { value: { id: 'bar' } },
      },
    }),
    responses: {
      200: extendApi(z.object({ id: z.string() }), {
        mediaExamples: {
          three: { value: { id: 'foo' } },
          four: { value: { id: 'bar' } },
        },
      }),
    },
  },
});

const expectedApiDoc = {
  info: {
    title: 'Blog API',
    version: '0.1',
  },
  openapi: '3.0.2',
  paths: {
    '/health': {
      get: {
        deprecated: undefined,
        description: "Check the application's health status",
        parameters: [],
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: 'Health API',
        tags: [],
      },
    },
    '/media-examples': {
      post: {
        deprecated: undefined,
        description: `Check that examples can be added to body and response types`,
        parameters: [
          {
            in: 'query',
            name: 'foo',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          description: 'Body',
          content: {
            'application/json': {
              schema: {
                properties: {
                  id: {
                    type: 'string',
                  },
                },
                required: ['id'],
                type: 'object',
              },
              examples: {
                one: { value: { id: 'foo' } },
                two: { value: { id: 'bar' } },
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                examples: {
                  three: { value: { id: 'foo' } },
                  four: { value: { id: 'bar' } },
                },
                schema: {
                  properties: {
                    id: {
                      type: 'string',
                    },
                  },
                  required: ['id'],
                  type: 'object',
                },
              },
            },
            description: `200`,
          },
        },
        summary: 'Examples API',
        tags: [],
      },
    },
    '/posts': {
      get: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: {
              nullable: true,
              type: 'string',
            },
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              default: 'date',
              enum: ['title', 'date'],
            },
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              default: 'asc',
              enum: ['asc', 'desc'],
            },
          },
          {
            in: 'query',
            name: 'obj',
            required: true,
            style: 'deepObject',
            schema: {
              properties: {
                a: {
                  type: 'string',
                },
              },
              required: ['a'],
              type: 'object',
            },
          },
        ],
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: undefined,
        tags: ['posts'],
      },
      post: {
        deprecated: true,
        description: undefined,
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  published: {
                    type: 'boolean',
                  },
                  title: {
                    type: 'string',
                  },
                },
                required: ['title'],
                type: 'object',
              },
            },
          },
          description: 'Body',
        },
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: undefined,
        tags: ['posts'],
      },
    },
    '/posts/{id}': {
      get: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: undefined,
        tags: ['posts'],
      },
    },
    '/posts/{id}/comments': {
      get: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  description: 'Post comments',
                  properties: {
                    comments: {
                      oneOf: [
                        {
                          items: {
                            properties: {
                              id: {
                                type: 'number',
                              },
                              title: {
                                type: 'string',
                              },
                            },
                            required: ['id', 'title'],
                            type: 'object',
                          },
                          type: 'array',
                        },
                        {
                          items: {
                            properties: {
                              author: {
                                type: 'string',
                              },
                              id: {
                                type: 'number',
                              },
                              title: {
                                type: 'string',
                              },
                            },
                            required: ['id', 'title', 'author'],
                            type: 'object',
                          },
                          type: 'array',
                        },
                      ],
                    },
                    booleanString: {
                      type: 'string',
                    },
                  },
                  required: ['booleanString', 'comments'],
                  type: 'object',
                },
              },
            },
            description: 'Post comments',
          },
        },
        summary: undefined,
        tags: ['posts', 'comments'],
      },
    },
    '/posts/{id}/comments/{commentId}': {
      get: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            in: 'path',
            name: 'commentId',
            required: true,
            description: 'the comment ID',
            schema: {
              type: 'string',
              minLength: 5,
              maxLength: 5,
            },
          },
        ],
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: undefined,
        tags: ['posts'],
      },
    },
    '/auth': {
      post: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            name: 'x-client-id',
            in: 'header',
            schema: {
              type: 'string',
            },
            required: true,
          },
          {
            name: 'x-api-key',
            in: 'header',
            schema: {
              type: 'string',
            },
            required: true,
          },
          {
            name: 'x-tenant-id',
            in: 'header',
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          description: 'Body',
          content: {
            'application/json': {
              schema: {
                readOnly: true,
              },
            },
          },
        },
        responses: {
          '200': {
            description: '200',
          },
        },
        summary: undefined,
        tags: ['posts'],
      },
    },
  },
};

describe('ts-rest-open-api', () => {
  describe('generateOpenApi', () => {
    it('should generate doc with defaults', async () => {
      const apiDoc = generateOpenApi(router, {
        info: { title: 'Blog API', version: '0.1' },
      });

      expect(apiDoc).toStrictEqual(expectedApiDoc);
    });

    it('should generate doc with operation ids', async () => {
      const apiDoc = generateOpenApi(
        router,
        {
          info: { title: 'Blog API', version: '0.1' },
        },
        { setOperationId: true },
      );

      expect(apiDoc).toEqual({
        ...expectedApiDoc,
        paths: {
          '/health': {
            get: {
              ...expectedApiDoc.paths['/health'].get,
              operationId: 'health',
            },
          },
          '/media-examples': {
            post: {
              ...expectedApiDoc.paths['/media-examples'].post,
              operationId: 'mediaExamples',
            },
          },
          '/posts': {
            get: {
              ...expectedApiDoc.paths['/posts'].get,
              operationId: 'findPosts',
            },
            post: {
              ...expectedApiDoc.paths['/posts'].post,
              operationId: 'createPost',
            },
          },
          '/posts/{id}': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}'].get,
              operationId: 'getPost',
            },
          },
          '/posts/{id}/comments': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}/comments'].get,
              operationId: 'getPostComments',
            },
          },
          '/posts/{id}/comments/{commentId}': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}/comments/{commentId}'].get,
              operationId: 'getPostComment',
            },
          },
          '/auth': {
            post: {
              ...expectedApiDoc.paths['/auth'].post,
              operationId: 'auth',
            },
          },
        },
      });
    });

    it('should generate doc with concatenated path operation ids', async () => {
      const apiDoc = generateOpenApi(
        router,
        {
          info: { title: 'Blog API', version: '0.1' },
        },
        { setOperationId: 'concatenated-path' },
      );

      expect(apiDoc).toEqual({
        ...expectedApiDoc,
        paths: {
          '/health': {
            get: {
              ...expectedApiDoc.paths['/health'].get,
              operationId: 'health',
            },
          },
          '/media-examples': {
            post: {
              ...expectedApiDoc.paths['/media-examples'].post,
              operationId: 'mediaExamples',
            },
          },
          '/posts': {
            get: {
              ...expectedApiDoc.paths['/posts'].get,
              operationId: 'posts.findPosts',
            },
            post: {
              ...expectedApiDoc.paths['/posts'].post,
              operationId: 'posts.createPost',
            },
          },
          '/posts/{id}': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}'].get,
              operationId: 'posts.getPost',
            },
          },
          '/posts/{id}/comments': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}/comments'].get,
              operationId: 'posts.comments.getPostComments',
            },
          },
          '/posts/{id}/comments/{commentId}': {
            get: {
              ...expectedApiDoc.paths['/posts/{id}/comments/{commentId}'].get,
              operationId: 'posts.getPostComment',
            },
          },
          '/auth': {
            post: {
              ...expectedApiDoc.paths['/auth'].post,
              operationId: 'posts.auth',
            },
          },
        },
      });
    });

    it('should generate doc with json query', async () => {
      const apiDoc = generateOpenApi(
        router,
        {
          info: { title: 'Blog API', version: '0.1' },
        },
        { jsonQuery: true },
      );

      expect(apiDoc).toEqual({
        ...expectedApiDoc,
        paths: {
          ...expectedApiDoc.paths,
          '/media-examples': {
            ...expectedApiDoc.paths['/media-examples'],
            post: {
              ...expectedApiDoc.paths['/media-examples'].post,
              parameters: [
                {
                  content: {
                    'application/json': {
                      examples: {
                        one: {
                          value: 'foo',
                        },
                        two: {
                          value: 'bar',
                        },
                      },
                      schema: {
                        type: 'string',
                      },
                    },
                  },
                  in: 'query',
                  name: 'foo',
                  required: true,
                },
              ],
            },
          },
          '/posts': {
            ...expectedApiDoc.paths['/posts'],
            get: {
              ...expectedApiDoc.paths['/posts'].get,
              parameters: [
                {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                        nullable: true,
                      },
                    },
                  },
                  in: 'query',
                  name: 'search',
                },
                {
                  content: {
                    'application/json': {
                      schema: {
                        default: 'date',
                        enum: ['title', 'date'],
                        type: 'string',
                      },
                    },
                  },
                  in: 'query',
                  name: 'sortBy',
                },
                {
                  content: {
                    'application/json': {
                      schema: {
                        default: 'asc',
                        enum: ['asc', 'desc'],
                        type: 'string',
                      },
                    },
                  },
                  in: 'query',
                  name: 'sort',
                },
                {
                  content: {
                    'application/json': {
                      schema: {
                        properties: {
                          a: {
                            type: 'string',
                          },
                        },
                        required: ['a'],
                        type: 'object',
                      },
                    },
                  },
                  in: 'query',
                  name: 'obj',
                  required: true,
                },
              ],
            },
          },
        },
      });
    });

    it('should throw when duplicate operationIds', async () => {
      const router = c.router({
        posts: postsRouter,
        getPost: {
          method: 'GET',
          path: `/posts/:id`,
          responses: {
            200: c.type<Post | null>(),
          },
        },
      });

      expect(() =>
        generateOpenApi(
          router,
          {
            info: { title: 'Blog API', version: '0.1' },
          },
          { setOperationId: true },
        ),
      ).toThrowError(/getPost/);
    });

    it('should not throw when duplicate operationIds with concatenated paths', async () => {
      const router = c.router({
        posts: postsRouter,
        getPost: {
          method: 'GET',
          path: `/posts/:id`,
          responses: {
            200: c.type<Post | null>(),
          },
        },
      });

      expect(() =>
        generateOpenApi(
          router,
          {
            info: { title: 'Blog API', version: '0.1' },
          },
          { setOperationId: 'concatenated-path' },
        ),
      ).not.toThrowError(/getPost/);
    });

    it('should add custom fields with operationMapper', async () => {
      const hasCustomTags = (
        metadata: unknown,
      ): metadata is { openApiTags: string[] } => {
        return (
          !!metadata &&
          typeof metadata === 'object' &&
          'openApiTags' in metadata
        );
      };

      const hasSecurity = (
        metadata: unknown,
      ): metadata is { openApiSecurity: SecurityRequirementObject[] } => {
        return (
          !!metadata &&
          typeof metadata === 'object' &&
          'openApiSecurity' in metadata
        );
      };

      const apiDoc = generateOpenApi(
        router,
        {
          info: { title: 'Blog API', version: '0.1' },
          components: {
            securitySchemes: {
              BasicAuth: {
                type: 'http',
                scheme: 'basic',
              },
            },
          },
        },
        {
          operationMapper: (operation, appRoute) => ({
            ...operation,
            ...(hasCustomTags(appRoute.metadata)
              ? {
                  tags: appRoute.metadata.openApiTags,
                }
              : {}),
            ...(hasSecurity(appRoute.metadata)
              ? {
                  security: appRoute.metadata.openApiSecurity,
                }
              : {}),
          }),
        },
      );
      expect(apiDoc).toEqual({
        ...expectedApiDoc,
        paths: {
          ...expectedApiDoc.paths,
          '/health': {
            ...expectedApiDoc.paths['/health'],
            get: {
              ...expectedApiDoc.paths['/health'].get,
              tags: router.health.metadata.openApiTags,
              security: router.health.metadata.openApiSecurity,
            },
          },
        },
        components: {
          securitySchemes: {
            BasicAuth: {
              type: 'http',
              scheme: 'basic',
            },
          },
        },
      });
    });

    it('works with zod refine', () => {
      const routerWithRefine = c.router({
        endpointWithZodRefine: {
          method: 'GET',
          path: '/refine',
          responses: {
            200: c.type<null>(),
          },
          query: z
            .object({
              foo: z.string().describe('Foo'),
            })
            .refine((v) => v.foo === 'bar', {
              message: 'foo must be bar',
            }),
        },
      });

      const schema = generateOpenApi(routerWithRefine, {
        info: { title: 'Blog API', version: '0.1' },
      });

      expect(schema).toEqual({
        info: {
          title: 'Blog API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/refine': {
            get: {
              deprecated: undefined,
              description: undefined,
              parameters: [
                {
                  description: 'Foo',
                  in: 'query',
                  name: 'foo',
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
              ],
              responses: {
                '200': {
                  description: '200',
                },
              },
              summary: undefined,
              tags: [],
            },
          },
        },
      });
    });

    it('works with zod optional query parameters', () => {
      const routerWithRefine = c.router({
        endpointWithZodRefine: {
          method: 'GET',
          path: '/optional',
          responses: {
            200: c.type<null>(),
          },
          query: z.object({
            foo: z
              .object({
                baz: z.string().describe('Baz').optional(),
                bar: z.string().describe('Bar').optional(),
              })
              .describe('Foo')
              .optional(),
          }),
        },
      });

      const schema = generateOpenApi(routerWithRefine, {
        info: { title: 'Blog API', version: '0.1' },
      });

      expect(schema).toEqual({
        info: {
          title: 'Blog API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/optional': {
            get: {
              deprecated: undefined,
              description: undefined,
              parameters: [
                {
                  description: 'Foo',
                  in: 'query',
                  name: 'foo',
                  schema: {
                    properties: {
                      bar: {
                        description: 'Bar',
                        type: 'string',
                      },
                      baz: {
                        description: 'Baz',
                        type: 'string',
                      },
                    },
                    type: 'object',
                  },
                  style: 'deepObject',
                },
              ],
              responses: {
                '200': {
                  description: '200',
                },
              },
              summary: undefined,
              tags: [],
            },
          },
        },
      });
    });

    it('works with zod transform', () => {
      const routerWithTransform = c.router({
        endpointWithZodTransform: {
          method: 'GET',
          path: '/transform',
          responses: {
            200: c.type<null>(),
          },
          query: z
            .object({
              foo: z.string(),
            })
            .transform((v) => ({ fooTransformed: v.foo })),
        },
      });

      const schema = generateOpenApi(routerWithTransform, {
        info: { title: 'Blog API', version: '0.1' },
      });

      expect(schema).toEqual({
        info: {
          title: 'Blog API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/transform': {
            get: {
              deprecated: undefined,
              description: undefined,
              parameters: [
                {
                  in: 'query',
                  name: 'foo',
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
              ],
              responses: {
                '200': {
                  description: '200',
                },
              },
              summary: undefined,
              tags: [],
            },
          },
        },
      });
    });

    it('works with multipart/form-data', () => {
      const routerWithTransform = c.router({
        formEndpoint: {
          method: 'POST',
          path: '/form',
          contentType: 'multipart/form-data',
          body: z.object({
            file: z.string(),
          }),
          responses: {
            200: c.type<null>(),
          },
        },
      });

      const schema = generateOpenApi(routerWithTransform, {
        info: { title: 'Form API', version: '0.1' },
      });

      expect(schema).toEqual({
        info: {
          title: 'Form API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/form': {
            post: {
              deprecated: undefined,
              description: undefined,
              parameters: [],
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      properties: {
                        file: {
                          type: 'string',
                        },
                      },
                      required: ['file'],
                      type: 'object',
                    },
                  },
                },
                description: 'Body',
              },
              responses: {
                '200': {
                  description: '200',
                },
              },
              summary: undefined,
              tags: [],
            },
          },
        },
      });
    });

    it('should extract references by title', () => {
      const entity = extendApi(
        z.object({
          file: z.string(),
        }),
        {
          title: 'Body',
        },
      );
      const routerWithTransform = c.router({
        formEndpoint: {
          method: 'PUT',
          path: '/title',
          body: entity,
          responses: {
            200: entity,
          },
        },
      });

      const schema = generateOpenApi(routerWithTransform, {
        info: { title: 'Title API', version: '0.1' },
      });

      expect(schema).toEqual({
        components: {
          schemas: {
            Body: {
              properties: {
                file: {
                  type: 'string',
                },
              },
              required: ['file'],
              title: 'Body',
              type: 'object',
            },
          },
        },
        info: {
          title: 'Title API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/title': {
            put: {
              parameters: [],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Body',
                    },
                  },
                },
                description: 'Body',
              },
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/Body',
                      },
                    },
                  },
                  description: '200',
                },
              },
              tags: [],
            },
          },
        },
      });
    });

    it('should extract nested references by title', () => {
      const child = extendApi(
        z.object({
          file: z.string(),
        }),
        {
          title: 'Child',
        },
      );
      const parent = extendApi(
        z.object({
          child: child,
        }),
        {
          title: 'Parent',
        },
      );
      const routerWithTransform = c.router({
        formEndpoint: {
          method: 'PUT',
          path: '/title',
          body: child,
          responses: {
            200: parent,
          },
        },
      });

      const schema = generateOpenApi(routerWithTransform, {
        info: { title: 'Title API', version: '0.1' },
      });

      expect(schema).toEqual({
        components: {
          schemas: {
            Child: {
              properties: {
                file: {
                  type: 'string',
                },
              },
              required: ['file'],
              title: 'Child',
              type: 'object',
            },
            Parent: {
              properties: {
                child: {
                  $ref: '#/components/schemas/Child',
                },
              },
              required: ['child'],
              title: 'Parent',
              type: 'object',
            },
          },
        },
        info: {
          title: 'Title API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/title': {
            put: {
              parameters: [],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Child',
                    },
                  },
                },
                description: 'Body',
              },
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/Parent',
                      },
                    },
                  },
                  description: '200',
                },
              },
              tags: [],
            },
          },
        },
      });
    });

    it('should extract nested references by nested-only title', () => {
      const child = extendApi(
        z.object({
          file: z.string(),
        }),
        {
          title: 'Child',
        },
      );
      const parent = extendApi(
        z.object({
          child: child,
        }),
      );
      const routerWithTransform = c.router({
        formEndpoint: {
          method: 'PUT',
          path: '/title',
          body: parent,
          responses: {
            200: parent,
          },
        },
      });

      const schema = generateOpenApi(routerWithTransform, {
        info: { title: 'Title API', version: '0.1' },
      });

      expect(schema).toEqual({
        components: {
          schemas: {
            Child: {
              properties: {
                file: {
                  type: 'string',
                },
              },
              required: ['file'],
              title: 'Child',
              type: 'object',
            },
          },
        },
        info: {
          title: 'Title API',
          version: '0.1',
        },
        openapi: '3.0.2',
        paths: {
          '/title': {
            put: {
              parameters: [],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      properties: {
                        child: {
                          $ref: '#/components/schemas/Child',
                        },
                      },
                      required: ['child'],
                      type: 'object',
                    },
                  },
                },
                description: 'Body',
              },
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        properties: {
                          child: {
                            $ref: '#/components/schemas/Child',
                          },
                        },
                        required: ['child'],
                        type: 'object',
                      },
                    },
                  },
                  description: '200',
                },
              },
              tags: [],
            },
          },
        },
      });
    });

    it('should throw if duplicated title', () => {
      const routerWithTransform = c.router({
        formEndpoint: {
          method: 'PUT',
          path: '/title',
          body: extendApi(
            z.object({
              file: z.string(),
            }),
            {
              title: 'Body',
            },
          ),
          responses: {
            200: extendApi(
              z.object({
                otherFile: z.string(),
              }),
              {
                title: 'Body',
              },
            ),
          },
        },
      });

      expect(() =>
        generateOpenApi(routerWithTransform, {
          info: { title: 'Title API', version: '0.1' },
        }),
      ).toThrowError(/already exists with a different schema/);
    });
  });
});
