import type { MaybeRefDeep } from '@tanstack/vue-query/build/modern/types';

export type MaybeRefDeepOrGetter<T> = MaybeRefDeep<T> | (() => T);
