# @ts-rest/open-api

## 3.52.0

### Minor Changes

- 83416b3: Support automatic reusable "Components" in OpenAPI schemas, reduces final size of schema, uses the "Title" property from @anatine/zod-openapi

## 3.51.1

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

## 3.46.0

## 3.45.2

## 3.45.1

## 3.45.0

## 3.44.1

## 3.44.0

## 3.43.0

### Minor Changes

- 77f23a8: Add `operationMapper` option to extend OpenAPI operations

## 3.42.0

## 3.41.2

## 3.41.1

## 3.41.0

### Patch Changes

- a0ee91d: Fix setting of response description

## 3.40.1

## 3.40.0

## 3.39.2

## 3.39.1

## 3.39.0

## 3.38.0

## 3.37.0

## 3.36.0

## 3.35.1

## 3.35.0

## 3.34.0

### Minor Changes

- b194d2a: Allow examples on body and responses

### Patch Changes

- 4665e0f: Correctly add `style: deepObject` for optional objects

## 3.33.1

## 3.33.0

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

## 3.29.0

### Patch Changes

- 5c80a5e: fix(ts-rest-open-api): pathParams and query descriptions from `zod` `.describe()`
- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

## 3.27.0

### Minor Changes

- b85118a: Add support for headers (using Zod) in open-api generation, from PR #318

### Patch Changes

- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1

## 3.26.4

## 3.26.3

## 3.26.2

## 3.26.1

## 3.26.0

## 3.25.1

### Patch Changes

- 81560d4: Fix ESM/CJS issues in package.json

## 3.25.0

## 3.24.0

## 3.23.0

## 3.22.0

## 3.21.2

## 3.21.1

### Patch Changes

- 1b4ef1e: Fix incorrect detection of zod objects with nested ZodEffects and fix regression with validation

## 3.21.0

### Patch Changes

- 8729bb5: Fix node16 esm module resolution

## 3.20.0

## 3.19.5

### Patch Changes

- 574dbab: Improved Zod object detection in OpenAPI
- a668ad7: Add missing support for Zod Refine

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

### Minor Changes

- cb2a794: Improved OpenAPI generation

## 3.16.2

## 3.16.1

## 3.16.0

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

### Patch Changes

- 0427ea3: Don't use $ref in OpenAPI

## 3.11.0

## 3.10.2

## 3.10.1

## 3.10.0

## 3.9.0

## 3.8.0

### Patch Changes

- c716ab5: Fixed missing query parameters in generated OpenAPI

## 3.7.0

## 3.6.1

## 3.6.0

### Minor Changes

- 6753c69: Build ESM and CommonJS for improved compatibility

## 3.5.0

## 3.4.2

## 3.4.1

## 3.4.0

### Minor Changes

- 3dc6b1c: Allow setting operationId in open-api docs

## 3.3.0

## 3.2.2

## 3.2.1

## 3.2.0

## 3.1.1

## 3.1.0

## 3.0.0

### Major Changes

- 895112a: Migrate paths to a string rather than function

### Patch Changes

- 6195da1: Fix body zod parsing not working at all

## 2.1.0

## 2.0.1

### Patch Changes

- 119aed6: Bump versions to 2.0.1

## 2.0.0

### Major Changes

- 4792b26: Change contract to support multiple responses, for different statuses

### Patch Changes

- 4792b26: Add error handling support to express

## 1.3.0

### Minor Changes

- a5d7e97: Add basic open-api support

### Patch Changes

- 077d57b: Update client to have zod response type
- 5f87b1a: Add OpenAPI options for generateOpenApi
