/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { Equal, Expect } from './test-helpers';
import {
  AreAllPropertiesOptional,
  Without,
  SchemaOutputOrType,
} from './type-utils';

const zodObject = z.object({ title: z.string() });
type Test1 = SchemaOutputOrType<typeof zodObject>;

const zodObjectNullable = zodObject.nullable();
type Test2 = SchemaOutputOrType<typeof zodObject>;

type Test3 = SchemaOutputOrType<{ title: string }>;

it.todo('should infer type');

type AreAllPropertiesOptional1 = Expect<
  Equal<AreAllPropertiesOptional<{ a: string; b?: string }>, false>
>;

type AreAllPropertiesOptional2 = Expect<
  Equal<AreAllPropertiesOptional<{ a?: string; b?: string }>, true>
>;

type AreAllPropertiesOptional3 = Expect<
  Equal<
    AreAllPropertiesOptional<{
      params: {
        id: string;
      };
      headers?: Record<string, string>;
    }>,
    false
  >
>;

type WithoutTest = Expect<
  Equal<
    Without<
      {
        body: never;
        params: {
          id: string;
        };
        headers?: Record<string, string>;
      },
      never
    >,
    {
      params: {
        id: string;
      };
      headers?: Record<string, string>;
    }
  >
>;
