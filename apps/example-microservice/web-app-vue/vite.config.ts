import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  cacheDir: '../../../node_modules/.vite/example-microservice-web-app-vue',

  plugins: [
    viteTsConfigPaths({
      root: '../../../',
    }),
    vue(),
  ],
  server: {
    port: 5006,
  },
  build: {
    outDir: '../../../dist/apps/example-microservice/web-app-vue',
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@ts-rest/core': path.resolve(
        __dirname,
        '../../../libs/ts-rest/core/src/index.ts',
      ),
      '@ts-rest/vue-query/v5': path.resolve(
        __dirname,
        '../../../libs/ts-rest/vue-query-v5/src/v5/index.ts',
      ),
      '@ts-rest/example-microservice/util-posts-api': path.resolve(
        __dirname,
        '../../../libs/example-microservice/util-posts-api/src/index.ts',
      ),
      '@ts-rest/example-contracts': path.resolve(
        __dirname,
        '../../../libs/example-contracts/src/index.ts',
      ),
    },
  },
});
