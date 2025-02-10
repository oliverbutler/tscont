# @ts-rest/fastify

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

## 3.48.1

### Patch Changes

- 48f2a8c: Use fastify logger for route initalization logs

## 3.48.0

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

### Minor Changes

- fb42b94: Add ts-rest route to fastify config object
- bfec125: Add option to define hooks on app level or route level
- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.

### Patch Changes

- 610428d: Fix when `pathPrefix` is used multiple times in nested contracts

## 3.45.2

## 3.45.1

## 3.45.0

### Minor Changes

- 3dc697f: Pass `appRoute` to route handlers

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

### Patch Changes

- 4e166b3: Fix fastify crashing on malformed request JSON

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

### Patch Changes

- a30326c: Remove console log in fasitfy route initialization for `@ts-rest/fastify`

## 3.30.0

## 3.29.0

### Patch Changes

- f45aa1b: fix: Type error when combining server contracts with fastify
- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

## 3.27.0

### Patch Changes

- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1
- f14ad97: Re-throw errors from route handlers
- 4444929: Pass the parsed request body from zod to the route handler instead of the original request.

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

### Minor Changes

- 871466c: Added support for registering ts-rest as a Fastify plugin

### Patch Changes

- bf21a75: Internal refactor of types

## 3.24.0

### Minor Changes

- 2c16e94: Release initial fastify implementation
