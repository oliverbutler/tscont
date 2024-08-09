import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { tsr } from '../../react-query-utils/tsr';
import { ClientComponentSuspense } from './client-component-suspense';
import { getQueryClientRsc } from '../../react-query-utils/get-query-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const queryData = {
  params: { id: 2 },
  query: { foo: 'test', bar: 123 },
};

export async function generateMetadata(): Promise<Metadata> {
  const tsrQueryClient = tsr.initQueryClient(getQueryClientRsc(true));
  const { body } = await tsrQueryClient.test.fetchQuery({
    queryKey: ['TEST_SUSPENSE'],
    queryData,
  });
  return {
    title: `Id: ${body.id}`,
  };
}

export default function Test() {
  const tsrQueryClient = tsr.initQueryClient(getQueryClientRsc(true));

  // no await here, so this will stream
  tsrQueryClient.test.prefetchQuery({
    queryKey: ['TEST_SUSPENSE'],
    queryData,
  });

  return (
    <main>
      <HydrationBoundary state={dehydrate(tsrQueryClient)}>
        <h1>Streaming Test</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <ClientComponentSuspense />
        </Suspense>
      </HydrationBoundary>
    </main>
  );
}
