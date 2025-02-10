# @ts-rest/express

## 3.52.0

## 3.51.1

### Patch Changes

- 6c987f6: Fix route handler type for DELETE endpoints with no body

## 3.51.0

## 3.50.0

## 3.49.4

## 3.49.3

## 3.49.2

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

## 3.48.1

## 3.48.0

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

### Minor Changes

- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.

## 3.45.2

## 3.45.1

## 3.45.0

## 3.44.1

## 3.44.0

## 3.43.0

### Minor Changes

- 308b966: `TsRestResponseError` can be thrown from any server package

## 3.42.0

## 3.41.2

## 3.41.1

## 3.41.0

## 3.40.1

## 3.40.0

## 3.39.2

## 3.39.1

## 3.39.0

### Minor Changes

- 860e402: Add contract definition for an absent body and handle accordingly on the server

## 3.38.0

### Minor Changes

- 33d6a57: Add single route implementation helper

## 3.37.0

## 3.36.0

## 3.35.1

## 3.35.0

## 3.34.0

### Patch Changes

- ea5c641: Export type `TsRestExpressOptions`

## 3.33.1

## 3.33.0

### Minor Changes

- 820658a: feat `@ts-rest/express`: Allow file downloads with Express

## 3.32.0

## 3.31.0

## 3.30.5

### Patch Changes

- 9bd7402: - `@ts-rest/fastify` fix: fastify deprecated routerPath property (fixes [#392](https://github.com/ts-rest/ts-rest/issues/392))
  - `@ts-rest/open-api` fix: Pass through contentType to OpenApi schema ([#414](https://github.com/ts-rest/ts-rest/pull/414))
  - `@ts-rest/core` fix: Content-type text/html returns blob body (fixes [#418](https://github.com/ts-rest/ts-rest/issues/418))
- 8cc95c5: add changeset for latest changes

## 3.30.4

### Patch Changes

- 10dff96: - fix: address `zod` [CVE](https://nvd.nist.gov/vuln/detail/CVE-2023-4316) with bump `@ts-rest` peer dependency `zod` to minimum `^3.22.3`
  - ref PR: https://github.com/colinhacks/zod/pull/2824

## 3.30.3

## 3.30.2

## 3.30.1

## 3.30.0

### Minor Changes

- 225921c: feat: added stronger typing for the `req` object in the route handler for '@ts-rest/express'

## 3.29.0

### Patch Changes

- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

## 3.27.0

### Patch Changes

- 637142f: Exposed `AppRouteOptions` and `AppRouteImplementation` types. They allow for greater developer flexibility and can be used to split router handlers.
- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1

## 3.26.4

## 3.26.3

## 3.26.2

## 3.26.1

## 3.26.0

### Minor Changes

- fcf877d: Allow defining non-json response types in the contract

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
- 74e41dc: Add middleware directly through ts-rest with type-safe injected route object

## 3.22.0

## 3.21.2

## 3.21.1

### Patch Changes

- 1b4ef1e: Fix incorrect detection of zod objects with nested ZodEffects and fix regression with validation

## 3.21.0

### Patch Changes

- 8729bb5: Fix node16 esm module resolution

## 3.20.0

### Minor Changes

- c1c1d31: Add type-safe header definitions to contracts

## 3.19.5

## 3.19.4

## 3.19.3

## 3.19.2

### Patch Changes

- 96ab6bd: Revert ESM fix, due to failed compilation on Next.js

## 3.19.1

### Patch Changes

- ecac73d: Fix compatibility with Node.js TS native ESM code

## 3.19.0

## 3.18.1

## 3.18.0

## 3.17.0

## 3.16.2

## 3.16.1

### Patch Changes

- 41a5fbb: Make @ts-rest/express ESM compatible

## 3.16.0

### Minor Changes

- e490cf3: - Added server-side response validation feature
- Deprecated `@Api` decorator, use `@TsRest` instead

## 3.15.0

## 3.14.0

## 3.13.1

### Patch Changes

- d778e60: Rebuilt without code comments in the compiled JS

## 3.13.0

## 3.12.1

### Patch Changes

- e0164f6: Publish README

## 3.12.0

### Minor Changes

- 5a13803: Allow typed query parameters by encoding them as JSON strings (disabled by default)

## 3.11.2

## 3.11.1

## 3.11.0

## 3.10.2

## 3.10.1

## 3.10.0

## 3.9.0

### Minor Changes

- 020a8c5: Allow optional [ts-rest] ... logging for express endpoints
- 020a8c5: Pass express errors to next() rather than catching them and handling with ts-rest

## 3.8.0

## 3.7.0

### Minor Changes

- d4d9be5: Add support for pathParams Zod verification

## 3.6.1

## 3.6.0

### Minor Changes

- 6753c69: Build ESM and CommonJS for improved compatibility

## 3.5.0

### Minor Changes

- 068822d: Add support for multipart/form-data

## 3.4.2

## 3.4.1

### Patch Changes

- 92346a0: Fix body not working without Zod schema

## 3.4.0

## 3.3.0

### Minor Changes

- bd619e4: Make createExpressEndpoints take IRouter instead of Express

## 3.2.2

### Patch Changes

- 09f8252: Expose request headers in express router

## 3.2.1

## 3.2.0

## 3.1.1

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
- 4792b26: Add error handling support to express
- c88fb99: Rename data to body to be more HTTP spec compliant

## 1.3.0

### Patch Changes

- 077d57b: Update client to have zod response type
- 5f87b1a: Add OpenAPI options for generateOpenApi

## 1.2.0

## 1.1.0

### Minor Changes

- 72dd65d: Extract express logic to @ts-rest/express
