// See @tanstack/vue-query/build/modern/utils

import type { MaybeRefDeep } from '@tanstack/vue-query/build/modern/types';
import type { cloneDeepUnref as cloneDeepUnrefTanstack } from '@tanstack/vue-query/build/modern/utils';
import { isRef, unref } from 'vue-demi';

function isFunction<T extends Function>(value: unknown): value is T {
  return typeof value === 'function';
}

function isPlainObject<T extends {}>(value: unknown): value is T {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function _cloneDeep<T>(
  value: MaybeRefDeep<T>,
  customize: (
    val: MaybeRefDeep<T>,
    key: string,
    level: number,
  ) => T | undefined,
  currentKey = '',
  currentLevel = 0,
): T {
  if (customize) {
    const result = customize(value, currentKey, currentLevel);
    if (result === void 0 && isRef(value)) {
      return result!;
    }
    if (result !== void 0) {
      return result;
    }
  }
  if (Array.isArray(value)) {
    return value.map((val, index) =>
      _cloneDeep(val, customize, String(index), currentLevel + 1),
    ) as T;
  }
  if (typeof value === 'object' && isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, val]) => [
      key,
      _cloneDeep(val, customize, key, currentLevel + 1),
    ]);
    return Object.fromEntries(entries);
  }
  return value as T;
}

export const cloneDeepUnref: typeof cloneDeepUnrefTanstack = (
  obj,
  unrefGetters = false,
) => {
  return _cloneDeep(obj, (val, key, level) => {
    if (level === 1 && key === 'queryKey') {
      return cloneDeepUnref(val, true);
    }
    if (unrefGetters && isFunction(val)) {
      return cloneDeepUnref(val(), unrefGetters);
    }
    if (isRef(val)) {
      return cloneDeepUnref(unref(val), unrefGetters);
    }
    return void 0;
  });
};
