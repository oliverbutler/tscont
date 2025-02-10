# @ts-rest/core

## 3.52.0

## 3.51.1

## 3.51.0

## 3.50.0

### Minor Changes

- 83f6675: Do not require `body` to be defined for DELETE endpoints in contracts

## 3.49.4

### Patch Changes

- 52a2b35: Fix broken types on TS 5.5 in Node environments without `lib.dom`

## 3.49.3

### Patch Changes

- 1f9fd4a: Fix client functions resolving as `any` in TS 5.5 when `dom` is not included in tsconfig libs
- 740c538: Fix pnpm `Maximum call stack size exceeded` when installing @ts-rest/core

## 3.49.2

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

### Minor Changes

- 597cd92: You can now pass functions as values for your `baseHeaders` in your client. This makes it much easier now to fetch and set access tokens from your authentication libraries.

## 3.48.1

### Patch Changes

- f2835dd: Fix merging of `baseHeaders` and `headers` in contracts when they are defined using plain types

## 3.48.0

## 3.47.0

## 3.46.0

### Minor Changes

- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.

## 3.45.2

## 3.45.1

## 3.45.0

## 3.44.1

## 3.44.0

### Minor Changes

- 60f90fa: Allow entire contract to be passed to `TsRestResponseError` so common responses can be thrown easily
- 45e5104: Add router-level metadata

## 3.43.0

### Minor Changes

- 308b966: `TsRestResponseError` can be thrown from any server package

## 3.42.0

### Minor Changes

- 7372bee: Allow arrays of files to be uploaded

## 3.41.2

## 3.41.1

## 3.41.0

### Minor Changes

- fc0adc6: Add contract option to define common responses

## 3.40.1

### Patch Changes

- afa5066: Fix incorrect type for URL `params` when using optional params without defining `pathParams`
- afa5066: Fix broken types for `c.responses()`

## 3.40.0

## 3.39.2

### Patch Changes

- dc554da: Fix `params` resolving as `any` when `pathParams` is missing and zod is not installed

## 3.39.1

## 3.39.0

### Minor Changes

- 860e402: Add contract definition for an absent body and handle accordingly on the server
- 487b2b6: Add `c.responses` utility

### Patch Changes

- 8f4cfe6: Fix client not validating response

## 3.38.0

### Patch Changes

- 0b9f249: Fix ts-rest overwriting a supplied content-type header
- 15d4926: Fix invalid `extraHeaders` type when no headers are defined in the contract

## 3.37.0

### Minor Changes

- 6a5280c: Allow fetch options to be set and client options to be overridden per request

### Patch Changes

- 77db06b: Fix client not correctly encoding application/x-www-form-urlencoded body

## 3.36.0

### Patch Changes

- c7e05d8: Fix optional path parameters showing in types with a question mark if path params are not used

## 3.35.1

## 3.35.0

## 3.34.0

## 3.33.1

## 3.33.0

## 3.32.0

### Minor Changes

- c4fb3f6: feat: `@ts-rest/core`: Add support for `x-www-form-urlencoded` content-type to core client fetcher

## 3.31.0

## 3.30.5

### Patch Changes

- 9bd7402: - `@ts-rest/fastify` fix: fastify deprecated routerPath property (fixes [#392](https://github.com/ts-rest/ts-rest/issues/392))
  - `@ts-rest/open-api` fix: Pass through contentType to OpenApi schema ([#414](https://github.com/ts-rest/ts-rest/pull/414))
  - `@ts-rest/core` fix: Content-type text/html returns blob body (fixes [#418](https://github.com/ts-rest/ts-rest/issues/418))
- 8cc95c5: add changeset for latest changes

## 3.30.4

### Patch Changes

- 10dff96: - (all packages) fix: address `zod` [CVE](https://nvd.nist.gov/vuln/detail/CVE-2023-4316) with bump `@ts-rest` peer dependency `zod` to minimum `^3.22.3`
  - ref PR: https://github.com/colinhacks/zod/pull/2824

## 3.30.3

### Patch Changes

- da48e62: fix: apply `validateResponseOnClient` recursively to nested App Routers in `@ts-rest/core` client

## 3.30.2

### Patch Changes

- bd0161b: fix: content-type application/json will not be automatically included in client request if the route is GET or body is undefined/null
  > if you need to send this header for whatever reason in a GET request/undefined body request, you can pass in runtime headers https://ts-rest.com/docs/core/#headers

## 3.30.1

## 3.30.0

### Minor Changes

- c056132: feat: add support for client-side response validation against contract schemas for `@ts-rest/core` (see docs for usage)

## 3.29.0

### Patch Changes

- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

### Minor Changes

- a7755ef: Adds support for fetch cache and support for Nextjs App Dir fetch (docs coming soon), see this PR for more info: https://github.com/ts-rest/ts-rest/pull/315
- 16501dd: tsRestFetchApi should be more flexible when determining application/json content type header

## 3.27.0

### Patch Changes

- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1

## 3.26.4

## 3.26.3

## 3.26.2

## 3.26.1

## 3.26.0

### Minor Changes

- fcf877d: Allow defining non-json response types in the contract
- 48b138d: Add new `SingleHandler` and `MultiHandler` API to `@ts-rest/nest`
- 2763208: Added `pathPrefix` to contract options to allow recursive path prefixing.

## 3.25.1

### Patch Changes

- 81560d4: Fix ESM/CJS issues in package.json

## 3.25.0

### Patch Changes

- bf21a75: Internal refactor of types

## 3.24.0

## 3.23.0

### Minor Changes

- 74bb4a8: Implement strict mode at a contract level. Strict mode ensures that only known responses are allowed by the type system. This applies both on the server and client side. Enable this with `strictStatusCodes: true` when defining a contract. If you would like to have the vanilla client throw an error when the response status is not known then you will need to use `throwOnUnknownStatus` when initializing the client.
- df77869: Response headers are now exposed to clients. Users of custom API fetchers should start returning headers.
- 74e41dc: Add 'metadata' property to routes

### BREAKING CHANGES FOR CUSTOM API FETCHERS

If you are using a custom API fetcher, you need to start returning response headers from your fetcher as a Web API [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) interface.

If you are using `fetch`, just simply return `response.headers`.

If you are using `axios`, you can return `new Headers(response.headers.toJSON())`

## 3.22.0

### Minor Changes

- d61b127: Implement tanstack query cancellation
- 1c53ac9: Add `throwOnUnknownStatus` to `initClient` configuration. When set to `true` the client will throw errors for all status codes returned by the server which are not defined in the contract.

## 3.21.2

## 3.21.1

### Patch Changes

- 1b4ef1e: Fix incorrect detection of zod objects with nested ZodEffects and fix regression with validation

## 3.21.0

### Minor Changes

- b2bf874: Added React Query QueryClient function helpers

### Patch Changes

- 8729bb5: Fix node16 esm module resolution
- b2bf874: Add rawQuery parameter to custom API fetcher parameters

## 3.20.0

### Minor Changes

- c1c1d31: Add type-safe header definitions to contracts

## 3.19.5

### Patch Changes

- 574dbab: Improved Zod object detection in OpenAPI

## 3.19.4

### Patch Changes

- 4b6e9f6: Filter out undefined values from json queries

## 3.19.3

## 3.19.2

### Patch Changes

- 96ab6bd: Revert ESM fix, due to failed compilation on Next.js

## 3.19.1

### Patch Changes

- 5e1c6a2: feat: add rawBody and contentType to Custom Client API arguments
- ecac73d: Fix compatibility with Node.js TS native ESM code

## 3.19.0

### Minor Changes

- 2bb39f8: Added inference type helpers

## 3.18.1

### Patch Changes

- 9bd4c77: Fixes broken typing where sometimes the client's request args were incorrectly typed as optional

## 3.18.0

### Minor Changes

- 3fa43d9: Export the default fetch API as `tsRestFetchApi` from the core library, enables you to easy modify the fetcher
- 3fa43d9: Add the ability to remove a baseHeader on a per-request basis by setting the headers value to undefined
- 3fa43d9: Allow custom API to allow extra args, and type them in the individual api calls
- 3fa43d9: Prettify the arguments of API calls, making it much clearer what data should be passed to ts-rest api calls (thanks @mattpocockuk!)

## 3.17.0

## 3.16.2

### Patch Changes

- 3fa8679: Do not throw error for missing content-type header

## 3.16.1

### Patch Changes

- 832b645: fix(core): wrong "content-type" detection

## 3.16.0

### Minor Changes

- e490cf3: - Added server-side response validation feature
- Deprecated `@Api` decorator, use `@TsRest` instead

## 3.15.0

### Patch Changes

- 0f1edf9: Rename some Nest functions and types, and deprecate old names

- Fix Nest deprecation warning when passing Zod error to HttpException (#122)

- Some internal helper types (`NestControllerShapeFromAppRouter` and `NestAppRouteShape`) that were previously exported are now kept internal.
  You can use `NestControllerInterface` and `NestRequestShapes` instead.

- 3f65909: Drop usage of ES6 Proxy for clients (fixes IE11 support)

## 3.14.0

### Minor Changes

- 13ca71b: Enable nested routers without declaring new constants

## 3.13.1

### Patch Changes

- d778e60: Rebuilt without code comments in the compiled JS

## 3.13.0

## 3.12.1

### Patch Changes

- e0164f6: Publish README

## 3.12.0

### Minor Changes

- a53a384: Add response shape shape helper to make allow you to extract the response from a Contract route
- 5a13803: Allow typed query parameters by encoding them as JSON strings (disabled by default)

### Patch Changes

- 36e5bd4: Fix typing for query

## 3.11.2

## 3.11.1

## 3.11.0

### Minor Changes

- 57acbad: Added the ability to omit the second parameter if there no required query parameters

## 3.10.2

## 3.10.1

## 3.10.0

### Minor Changes

- 046e498: Use Nest.js req.query and req.params instead of parsing from URL

### Patch Changes

- 35c64db: Move next lib utils out of @ts-rest/core to reduce bundle size

## 3.9.0

## 3.8.0

### Minor Changes

- 59b8d29: Add credentials option for fetch client

### Patch Changes

- 1b3faaf: Use z.input for body and query types for clients

## 3.7.0

### Minor Changes

- d4d9be5: Add support for pathParams Zod verification
- 8a19717: Add pathParams transformations

## 3.6.1

## 3.6.0

### Minor Changes

- 6753c69: Build ESM and CommonJS for improved compatibility

## 3.5.0

### Minor Changes

- 068822d: Add support for multipart/form-data

## 3.4.2

## 3.4.1

## 3.4.0

## 3.3.0

## 3.2.2

## 3.2.1

## 3.2.0

## 3.1.1

### Patch Changes

- d3a74fe: Remove unnecessary recursion

## 3.1.0

## 3.0.0

### Major Changes

- 895112a: Migrate paths to a string rather than function

## 2.1.0

### Minor Changes

- 75f157a: Add Zod validation to @ts-rest/next

## 2.0.1

### Patch Changes

- 119aed6: Bump versions to 2.0.1

## 2.0.0

### Major Changes

- 4792b26: Change contract to support multiple responses, for different statuses
- c88fb99: Rename data to body to be more HTTP spec compliant

### Patch Changes

- 4792b26: Add error handling support to express

## 1.3.0

### Minor Changes

- a5d7e97: Add basic open-api support

### Patch Changes

- 077d57b: Update client to have zod response type
- 5f87b1a: Add OpenAPI options for generateOpenApi

## 1.2.0

### Minor Changes

- 987fd07: Add query and mutation support to react-query, instead of requring useMutation and useQuery

## 1.1.0

### Minor Changes

- 72dd65d: Extract express logic to @ts-rest/express

## 1.0.4

### Patch Changes

- 3adb9c8: Change build path

## 1.0.3

### Patch Changes

- 0d706a3: Sync package versions

## 1.0.2

### Patch Changes

- 1fe80ea: sync versions

## 1.0.1

### Patch Changes

- 8d908ee: Update package scope

## 1.0.0

### Minor Changes

- 86a5cb7: add react-query and nest integration
