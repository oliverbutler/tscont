import { StandardSchemaV1 } from './standard-schema';
import { mergeStandardSchema } from './standard-schema-utils';
import { z } from 'zod';

describe('mergeStandardSchema', () => {
  it('should merge two strict schemas', () => {
    const baseHeaders = z.object({ foo: z.string() }).strict();
    const routeHeaders = z.object({ bar: z.string() }).strict();
    const headers = mergeStandardSchema(
      baseHeaders,
      routeHeaders,
    ) as StandardSchemaV1;

    expect(
      headers['~standard'].validate({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toEqual({
      issues: [
        {
          code: 'unrecognized_keys',
          keys: ['bar', 'baz'],
          message: "Unrecognized key(s) in object: 'bar', 'baz'",
          path: [],
        },
        {
          code: 'unrecognized_keys',
          keys: ['foo', 'baz'],
          message: "Unrecognized key(s) in object: 'foo', 'baz'",
          path: [],
        },
      ],
    });
  });

  it('should merge a strict and non-strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() }).strict();
    const routeHeaders = z.object({ bar: z.string() });
    const headers = mergeStandardSchema(
      baseHeaders,
      routeHeaders,
    ) as StandardSchemaV1;

    expect(
      headers['~standard'].validate({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toEqual({
      issues: [
        {
          code: 'unrecognized_keys',
          keys: ['bar', 'baz'],
          message: "Unrecognized key(s) in object: 'bar', 'baz'",
          path: [],
        },
      ],
    });
  });

  it('should merge a non-strict and strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() });
    const routeHeaders = z.object({ bar: z.string() }).strict();
    const headers = mergeStandardSchema(
      baseHeaders,
      routeHeaders,
    ) as StandardSchemaV1;

    expect(
      headers['~standard'].validate({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toEqual({
      issues: [
        {
          code: 'unrecognized_keys',
          keys: ['foo', 'baz'],
          message: "Unrecognized key(s) in object: 'foo', 'baz'",
          path: [],
        },
      ],
    });
  });

  it('should merge a non-strict and non-strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() });
    const routeHeaders = z.object({ bar: z.string() });
    const headers = mergeStandardSchema(
      baseHeaders,
      routeHeaders,
    ) as StandardSchemaV1;

    expect(
      headers['~standard'].validate({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toEqual({
      value: {
        foo: 'foo',
        bar: 'bar',
      },
    });
  });
});
