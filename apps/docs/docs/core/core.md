# Contract

Use the `@ts-rest/core` package to define a contract. Nesting routers can help organize your resources. For example, `/users/:id/posts` could have a nested router `contract.users.posts`. This is the path that you'd use on the client to query the API.

Breaking down the contract to sub-routers also allows you to split up the backend implementation. For example, in Nest.js you could have multiple controllers for the sub-routers.

You can define your contract fields such as `body`, `query`, `pathParams`, and `headers` using a plain Typescript through the `c.type` helper, or you can use Zod objects.

```typescript
const c = initContract();

export const contract = c.router({
  createPost: {
    method: 'POST',
    path: '/posts',
    //     ^ Note! This is the full path on the server, not just the sub-path of a route
    responses: {
      201: c.type<Post>(),
    },
    body: z.object({
      title: z.string(),
      content: z.string(),
      published: z.boolean().optional(),
      description: z.string().optional(),
    }),
    summary: 'Create a post',
    metadata: { role: 'user' } as const,
  },
  getPosts: {
    method: 'GET',
    path: '/posts',
    responses: {
      200: c.type<{ posts: Post[]; total: number }>(),
    },
    headers: z.object({
      pagination: z.string().optional(),
    }),
    query: z.object({
      take: z.string().transform(Number).optional(),
      skip: z.string().transform(Number).optional(),
      search: z.string().optional(),
    }),
    summary: 'Get all posts',
    metadata: { role: 'guest' } as const,
  },
});
```

## Query Parameters

All query parameters, by default, need to have an input type of `string` since query strings inherently cannot be typed, however, ts-rest allows you to encode query parameters as JSON values.
This will allow you to use input types other than strings in your contracts.

```typescript
const c = initContract();
export const contract = c.router({
    getPosts: {
        ...,
        query: z.object({
            take: z.number().default(10),
            skip: z.number().default(0),
            search: z.string().optional(),
        }),
    }
});
```

Check the relevant sections to see how to enable JSON query encoding/decoding on the client or server.

## Path Parameters

You can define URL path parameters in your contract using a Zod object with the `path` and `pathParams` keys.

```typescript
const c = initContract();
export const contract = c.router({
  getPost: {
    ...,
    path: '/api/posts/:id',
    pathParams: z.object({
      id: z.string(),
    }),
  }
});
```

Since URLs are just strings, any type other than `string` would need to be coerced or transformed into the required type. Using zod's `.coerce` for example:

```typescript
const c = initContract();
export const contract = c.router({
  getPost: {
    ...,
    path: '/api/posts/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
  }
});
```

## Headers

You can define headers in your contract, however, they must have an input type of `string`, as they cannot be typed otherwise.
You can use Zod transforms or coercion to transform any string values to different types if needed.

```typescript
const c = initContract();
export const contract = c.router({
  getPosts: {
    ...,
    headers: z.object({
      authorization: z.string(),
      pagination: z.coerce.number().optional(),
    }),
  }
});
```

You can also define base headers for all routes in a contract and its sub-contracts, this is useful for things like authorization headers.
This will force the client to always pass

```typescript
const c = initContract();
export const contract = c.router(
  {
    // ...endpoints
  },
  {
    baseHeaders: z.object({
      authorization: z.string(),
    }),
  }
);
```

## Responses

To define your response types, they need to be defined as a map of status codes to response types.

Responses are assumed by default to be JSON responses, however, you can define other response types using `c.otherResponse` and passing in the content type header value and body type or Zod schema.

```typescript
const c = initContract();

export const contract = c.router({
  createPost: {
    ...,
    responses: {
      201: z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        published: z.boolean(),
        description: z.string(),
      }),
      404: c.type<{ message: string }>(),
      500: c.otherResponse({
        contentType: 'text/plain',
        body: z.literal('Server Error'),
      })
    },
    ...,
  },
});
```

### Common Responses

APIs often have shared common response schemas, specifically for error responses. You can define these common responses in the contract options.

```typescript
const c = initContract();
export const contract = c.router(
  {
    // ...endpoints
  },
  {
    commonResponses: {
      404: c.type<{ message: 'Not Found'; reason: string }>(),
      500: c.otherResponse({
        contentType: 'text/plain',
        body: z.literal('Server Error'),
      }),
    },
  }
);
```

### Strict Response Status Codes

To help with incremental adoption, ts-rest, by default, will allow any response status code to be returned from the server
even if it is not defined in the contract.

As a result, the response types on the client will include all possible HTTP status codes, even ones that are not defined
in the contract with those mapping to a body type of `unknown`.

If you would like to disable this functionality and only allow the response status codes defined in the contract, you can
set the `strictStatusCodes` option to `true` when initializing the contract.

```typescript
const c = initContract();
export const contract = c.router(
  {
    // ...endpoints
  },
  {
    strictStatusCodes: true,
  }
);
```

You can also set this option on a per-route basis which will also override the global option.

```typescript
const c = initContract();
export const contract = c.router({
  getPosts: {
    ...,
    strictStatusCodes: true,
  }
});
```

## Combining Contracts

You can combine contracts to create a single contract, helpful if you want many sub-contracts, especially if they are huge.

```typescript
const c = initContract();

export const postContract = c.router({
  getPosts: {
    method: 'GET',
    path: '/posts',
    responses: {
      200: c.type<{ posts: Post[]; total: number }>(),
    },
    query: z.object({
      take: z.string().transform(Number).optional(),
      skip: z.string().transform(Number).optional(),
      search: z.string().optional(),
    }),
    summary: 'Get all posts',
  },
});

export const contract = c.router({
  posts: postContract,
});
```

## Metadata

You can attach metadata with any type to your contract routes that can be accessed anywhere throughout ts-rest where
you have access to the contract route object.

```typescript
const c = initContract();
export const contract = c.router({
    getPosts: {
        ...,
        metadata: { role: 'guest' } as const,
    }
});
```

:::caution

As the contract is not only used on the server, but on the client as well, it will also be part of your client-side bundle.
You should not put any sensitive information in the metadata.

:::

## Intellisense

For intellisense on your contract types, you can use [JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#type).

```typescript
const c = initContract();

export const contract = c.router({
  getPosts: {
    method: 'GET',
    path: '/posts',
    responses: {
      200: c.type<{ posts: Post[]; total: number }>(),
    },
    query: z.object({
      /**
       * @type {string} - UTC timestamp in milliseconds
       */
      beginDate: z.string(),
      /**
       * @type {string} - UTC timestamp in milliseconds
       */
      endDate: z.string(),
    }),
    summary: 'Get posts within time-range',
  },
});
```

## Options

These configuration options allow you to modify how your contract functions.

### Base Header

You can assign `baseHeaders` which will be merged with the contract `headers`. Here's how to set it:

```typescript
const c = initContract();
export const contract = c.router(
  {
    // ...endpoints
  },
  {
    baseHeaders: z.object({
      authorization: z.string(),
    }),
  }
);
```

### Path Prefix

The `pathPrefix` option allows you to add a prefix to paths, allowing more modular and reusable routing logic. This option is applied recursively, allowing the application of prefixes to nested contracts. In addition, when hovering over the contract, the prefixed path will appear at the beginning of the path for ease of use.

Here is an example of how to use the `pathPrefix` option. In this example, the resulting path is `/api/v1/mypath`.

```typescript
const c = initContract();
export const contract = c.router(
  {
    getPost: {
      path: '/mypath',
      //... Your Contract
    },
  },
  {
    pathPrefix: '/api/v1',
  }
);
```

You can also use this feature in nested contracts, as shown below. In this case, the resulting path is `/v1/posts/mypath`, with the `pathPrefix` of the nested contract following the `pathPrefix` of the parent contract.

```typescript
const nestedContract = c.router(
  {
    getPost: {
      path: '/mypath',
      //... Your Contract
    },
  },
  {
    pathPrefix: '/posts',
  }
);

const parentContract = c.router(
  {
    posts: nestedContract,
  },
  {
    pathPrefix: '/v1',
  }
);
```
