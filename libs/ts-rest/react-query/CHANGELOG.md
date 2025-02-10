# @ts-rest/react-query

## 3.52.0

## 3.51.1

## 3.51.0

### Minor Changes

- d9111cc: Add ability to pass `skipToken` to `queryData` similar to how you can pass it to `queryFn` in plain React Query

## 3.50.0

## 3.49.4

## 3.49.3

## 3.49.2

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

### Minor Changes

- 597cd92: You can now pass functions as values for your `baseHeaders` in your client. This makes it much easier now to fetch and set access tokens from your authentication libraries.
- 597cd92: New and vastly improved React Query integration with v5 support in `@ts-rest/react-query/v5`

## 3.48.1

## 3.48.0

### Minor Changes

- 24bb37c: RECOMMENDED: Add `includeThrownErrorsInErrorType` in react query client options. This should include the `Error` exception in the `error` type to cover non-HTTP errors such as network or CORS errors. Disabled by default so it does not break existing code, but extremely recommended to switch on.

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

## 3.45.2

## 3.45.1

## 3.45.0

### Minor Changes

- 5f83426: Export the entire `@tanstack/react-query` from `@ts-rest/react-query/tanstack` to fix `No QueryClient set` errors caused by version mismatches

## 3.44.1

## 3.44.0

## 3.43.0

## 3.42.0

## 3.41.2

## 3.41.1

## 3.41.0

### Patch Changes

- 5a48f18: Fix `select` option

## 3.40.1

## 3.40.0

## 3.39.2

## 3.39.1

## 3.39.0

## 3.38.0

## 3.37.0

### Minor Changes

- 6a5280c: Allow fetch options to be set and client options to be overridden per request

## 3.36.0

## 3.35.1

## 3.35.0

## 3.34.0

## 3.33.1

### Patch Changes

- 6d2c369: Remove TanStack Query v5 from peer dependencies

## 3.33.0

## 3.32.0

## 3.31.0

### Minor Changes

- 29fe85b: feat: `@ts-rest/react-query` use object-syntax in react-query to support [@tanstack/react-query@^5.0.0](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)

  - note: This does **not** implement a complete migration to v5 but lays the groundwork to get the ball rolling and apps running again.

  feat: `@ts-rest/vue-query` add @tanstack/vue-query@^5.0.0 as peer dependency

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

- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

## 3.27.0

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

### Patch Changes

- bf21a75: Internal refactor of types

## 3.24.0

## 3.23.0

### Minor Changes

- df77869: Response headers are now exposed to clients. Users of custom API fetchers should start returning headers.

## 3.22.0

### Minor Changes

- d61b127: Implement tanstack query cancellation

## 3.21.2

### Patch Changes

- 42c478a: Provide QueryClient functions through client directly

## 3.21.1

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

## 3.19.4

## 3.19.3

### Patch Changes

- 5ee543f: Export ts-rest react-query types

## 3.19.2

### Patch Changes

- 96ab6bd: Revert ESM fix, due to failed compilation on Next.js

## 3.19.1

### Patch Changes

- 5e1c6a2: feat: add rawBody and contentType to Custom Client API arguments
- ecac73d: Fix compatibility with Node.js TS native ESM code

## 3.19.0

## 3.18.1

## 3.18.0

### Minor Changes

- 3fa43d9: Allow custom API to allow extra args, type them in the react query api calls
- 3fa43d9: Add the ability to remove a baseHeader on a per-request basis by setting the headers value to undefined
- 3fa43d9: Prettify the arguments of API calls, making it much clearer what data should be passed to ts-rest api calls (thanks @mattpocockuk!)

## 3.17.0

## 3.16.2

## 3.16.1

## 3.16.0

## 3.15.0

### Patch Changes

- 3f65909: Drop usage of ES6 Proxy for clients (fixes IE11 support)

## 3.14.0

## 3.13.1

### Patch Changes

- d778e60: Rebuilt without code comments in the compiled JS

## 3.13.0

### Minor Changes

- 491a32d: Add useQueries capability

## 3.12.1

### Patch Changes

- e0164f6: Publish README

## 3.12.0

### Minor Changes

- 5a13803: Allow typed query parameters by encoding them as JSON strings (disabled by default)

### Patch Changes

- 36e5bd4: Fix typing for query

## 3.11.2

## 3.11.1

## 3.11.0

### Minor Changes

- 57acbad: Added the ability to omit the second parameter if there no required query parameters

## 3.10.2

### Patch Changes

- fd456fc: Fix CJS export, fixes @ts-rest/react-query 3.10.1

## 3.10.1

### Patch Changes

- 7f76c10: Fix missing typings due to new declaration file path

## 3.10.0

## 3.9.0

## 3.8.0

### Patch Changes

- 1b3faaf: Use z.input for body and query types for clients

## 3.7.0

## 3.6.1

### Patch Changes

- Update package.json exports to fix #66

## 3.6.0

### Minor Changes

- 6753c69: Build ESM and CommonJS for improved compatibility

## 3.5.0

### Minor Changes

- 068822d: Add support for multipart/form-data

## 3.4.2

### Patch Changes

- 242d795: Fix custom api not being used on useMutation

## 3.4.1

## 3.4.0

## 3.3.0

## 3.2.2

## 3.2.1

### Patch Changes

- 029de31: Fix missing typescript definitions

## 3.2.0

### Minor Changes

- c9a5a52: Add useInfiniteQuery support to @ts-rest/react-query
