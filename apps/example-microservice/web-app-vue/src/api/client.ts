import { apiBlog } from '@ts-rest/example-contracts';
import { createTsRestPlugin } from '@ts-rest/vue-query/v5';

export const { TsRestPlugin, useClient, useQueryClient } = createTsRestPlugin(
  apiBlog,
  {
    baseUrl: 'http://localhost:3334',
    baseHeaders: {
      'x-api-key': 'key',
    },
  },
);
