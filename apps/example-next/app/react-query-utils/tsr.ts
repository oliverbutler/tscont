import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { testContract } from '../../contracts/test-contract';

export const tsr = initTsrReactQuery(testContract, {
  baseUrl: 'http://localhost:4200/api/app-router',
  baseHeaders: {},
});
