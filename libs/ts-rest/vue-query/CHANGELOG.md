# @ts-rest/vue-query

## 3.52.0

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

### Minor Changes

- 597cd92: You can now pass functions as values for your `baseHeaders` in your client. This makes it much easier now to fetch and set access tokens from your authentication libraries.

## 3.48.1

## 3.48.0

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

## 3.45.2

## 3.45.1

## 3.45.0

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

### Patch Changes

- bd0161b: fix: content-type application/json will not be automatically included in client request if the route is GET or body is undefined/null

## 3.30.1

## 3.30.0

## 3.29.0

### Minor Changes

- 2feedbb: Adds new `@ts-rest/vue-query` package!
  - feat: add support @tanstack/vue-query
  - feat: add docs for @tanstack/vue-query package
