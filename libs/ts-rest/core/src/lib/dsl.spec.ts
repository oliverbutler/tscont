/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import {
  initContract,
  ContractOtherResponse,
  ContractPlainType,
  ContractPlainTypeRuntimeSymbol,
  ContractNoBodyType,
} from './dsl';
import type { Equal, Expect } from './test-helpers';
import { Prettify } from './type-utils';
import { StandardSchemaV1 } from './standard-schema';

const c = initContract();

describe('contract', () => {
  it('should be typed correctly', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: z.ZodObject<
                {
                  id: z.ZodNumber;
                },
                'strip',
                z.ZodTypeAny,
                {
                  id: number;
                },
                {
                  id: number;
                }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with nested routers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with headers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
          headers: z.object({
            'x-foo': z.string(),
          }),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                { 'x-foo': z.ZodString },
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string },
                { 'x-foo': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with base headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                { 'x-foo': z.ZodString },
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string },
                { 'x-foo': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-bar': z.string(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: StandardSchemaV1<
                {
                  'x-foo': string;
                } & {
                  'x-bar': string;
                },
                {
                  'x-foo': string;
                } & {
                  'x-bar': string;
                }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged plain type headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: c.type<{ 'x-bar': string }>(),
          },
        },
      },
      {
        baseHeaders: c.type<{ 'x-foo': string }>(),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: {
                'x-foo': string;
                'x-bar': string;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with overridden headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-foo': z.string().optional(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: StandardSchemaV1<
                {
                  'x-foo': string;
                } & {
                  'x-foo'?: string | undefined;
                },
                {
                  'x-foo': string;
                } & {
                  'x-foo'?: string | undefined;
                }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed without zod', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: c.type<{ id: number }>(),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate query route', () => {
    const getPost = c.query({
      method: 'GET',
      path: '/posts/:id',
      responses: {
        200: c.type<{ id: number }>(),
      },
    });

    const contract = c.router({
      getPost,
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate mutation route', () => {
    const createPost = c.mutation({
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<{ id: number }>(),
      },
      body: c.type<{ title: string }>(),
    });

    const contract = c.router({
      createPost,
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          createPost: {
            method: 'POST';
            path: '/posts';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
            body: ContractPlainType<{
              title: string;
            }>;
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate responses', () => {
    const responses = c.responses({
      200: c.type<{ id: number }>(),
    });

    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses,
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate responses with spread', () => {
    const responses = c.responses({
      200: c.type<{ id: number }>(),
    });

    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          ...responses,
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should add strictStatusCodes=true option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: true,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should add strictStatusCodes=false option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: false,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly is route is true', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
          strictStatusCodes: true,
        },
      },
      {
        strictStatusCodes: false,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly if route is false', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
          strictStatusCodes: false,
        },
      },
      {
        strictStatusCodes: true,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  it('should merge metadata options from router to its routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
        deletePost: {
          method: 'DELETE',
          path: '/posts/:id',
          body: c.type<undefined>(),
          metadata: {
            requireAuth: false,
            headerName: 'x-authorization',
          },
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        metadata: {
          requireAuth: true,
        },
      },
    );

    expect(contract.getPost.metadata).toStrictEqual({
      requireAuth: true,
    });

    expect(contract.deletePost.metadata).toStrictEqual({
      requireAuth: false,
      headerName: 'x-authorization',
    });

    type MetadataShape = Expect<
      Equal<
        typeof contract.getPost.metadata,
        {
          requireAuth: boolean;
        }
      >
    >;

    type MetadataShape2 = Expect<
      Equal<
        Prettify<typeof contract.deletePost.metadata>,
        {
          requireAuth: boolean;
          headerName: string;
        }
      >
    >;
  });

  describe('pathPrefix', () => {
    it('Should recursively apply pathPrefix to path', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
        },
        { pathPrefix: '/posts' },
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { pathPrefix: '/v1' },
      );
      expect(postsContractNested.getPost.path).toStrictEqual('/posts/:id');
      expect(postsContract.posts.getPost.path).toStrictEqual('/v1/posts/:id');

      type PostsContractNestedShape = Expect<
        Equal<
          typeof postsContractNested,
          {
            getPost: {
              path: '/posts/:id';
              method: 'GET';
              responses: { 200: ContractPlainType<{ id: string }> };
            };
          }
        >
      >;

      type PostsContractShape = Expect<
        Equal<
          typeof postsContract,
          {
            posts: {
              getPost: {
                path: '/v1/posts/:id';
                method: 'GET';
                responses: { 200: ContractPlainType<{ id: string }> };
              };
            };
          }
        >
      >;
    });
  });

  describe('validateResponseOnClient', () => {
    it('Should recursively apply validateResponseOnClient to routes', () => {
      const postsContractNested = c.router({
        getPost: {
          path: '/:id',
          method: 'GET',
          responses: { 200: c.type<{ id: string }>() },
        },
      });
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true },
      );
      expect(postsContractNested.getPost).toHaveProperty(
        'validateResponseOnClient',
        undefined,
      );
      expect(postsContract.posts.getPost).toHaveProperty(
        'validateResponseOnClient',
        true,
      );
    });

    it('Should not override validateResponseOnClient if set on nested router', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
        },
        { validateResponseOnClient: false },
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true },
      );
      expect(postsContractNested.getPost).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
      expect(postsContract.posts.getPost).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
    });

    it('Should not override validateResponseOnClient when set directly on route', () => {
      const postsContract = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
          getPostDangerously: {
            path: '/:id/dangerous',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
            validateResponseOnClient: false,
          },
        },
        { validateResponseOnClient: true },
      );

      expect(postsContract.getPost).toHaveProperty(
        'validateResponseOnClient',
        true,
      );
      expect(postsContract.getPostDangerously).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
    });
  });

  it('should set type correctly for non-json response', () => {
    const contract = c.router({
      getCss: {
        method: 'GET',
        path: '/style.css',
        responses: {
          200: c.otherResponse({
            contentType: 'text/css',
            body: c.type<string>(),
          }),
        },
      },
    });

    expect(contract.getCss.responses['200']).toEqual({
      contentType: 'text/css',
      body: ContractPlainTypeRuntimeSymbol,
    });

    type ResponseType = Expect<
      Equal<
        (typeof contract.getCss.responses)['200'],
        ContractOtherResponse<ContractPlainType<string>>
      >
    >;
  });

  it('should set type correctly for no body', () => {
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/',
        responses: {
          204: c.noBody(),
        },
      },
    });

    type ResponseType = Expect<
      Equal<(typeof contract.get.responses)['204'], ContractNoBodyType>
    >;
  });

  it('should be typed correctly with merged common responses', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
          },
        },
      },
      {
        commonResponses: {
          404: z.object({
            message: z.string(),
          }),
        },
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
                404: z.ZodObject<
                  {
                    message: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    message: string;
                  },
                  {
                    message: string;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged common responses and overriding common response', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
              400: z.object({
                overrideReason: z.string(),
              }),
            },
          },
        },
      },
      {
        commonResponses: {
          400: z.object({
            reason: z.string(),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
                400: z.ZodObject<
                  {
                    overrideReason: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    overrideReason: string;
                  },
                  {
                    overrideReason: string;
                  }
                >;
                404: z.ZodObject<
                  {
                    message: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    message: string;
                  },
                  {
                    message: string;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });
});
