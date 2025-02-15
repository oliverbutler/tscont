import { checkZodSchema, zodMerge } from './zod-utils';
import { z } from 'zod';

describe('checkZodSchema', () => {
  it('should return success true and data when schema is not a zod object', () => {
    const result = checkZodSchema({ a: 1 }, z.object({ a: z.number() }));
    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('This should not happen');
    }

    expect(result.data).toEqual({ a: 1 });
  });

  it('should return success false if invalid', () => {
    const result = checkZodSchema({ a: '' }, z.object({ a: z.number() }));
    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('This should not happen');
    }

    expect(result.error.issues).toHaveLength(1);
  });

  it('should return success false if invalid with nested refine', () => {
    const result = checkZodSchema(
      { a: '' },
      z
        .object({ a: z.number() })
        .refine(() => true)
        .refine(() => true),
    );
    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('This should not happen');
    }

    expect(result.error.issues).toHaveLength(1);
  });

  it('should pass through extra keys if passThroughExtraKeys is true', () => {
    const result = checkZodSchema({ a: 1, b: 2 }, z.object({ a: z.number() }), {
      passThroughExtraKeys: true,
    });
    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('This should not happen');
    }

    expect(result.data).toEqual({ a: 1, b: 2 });
  });

  it('should not pass through extra keys if passThroughExtraKeys is false', () => {
    const result = checkZodSchema({ a: 1, b: 2 }, z.object({ a: z.number() }));

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('This should not happen');
    }

    expect(result.data).toEqual({ a: 1 });
  });

  it.each([undefined, null, '', { a: '123' }])(
    'should return true if schema is not a valid zod schema - $i',
    (i) => {
      const result = checkZodSchema({ a: 1 }, i);
      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error('This should not happen');
      }

      expect(result.data).toEqual({ a: 1 });
    },
  );
});

describe('zodMerge', () => {
  it('should merge two strict schemas', () => {
    const baseHeaders = z.object({ foo: z.string() }).strict();
    const routeHeaders = z.object({ bar: z.string() }).strict();
    const headers = zodMerge(baseHeaders, routeHeaders) as z.ZodSchema;

    expect(() =>
      headers.parse({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toThrowError('baz');
  });

  it('should merge a strict and non-strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() }).strict();
    const routeHeaders = z.object({ bar: z.string() });
    const headers = zodMerge(baseHeaders, routeHeaders) as z.ZodSchema;

    expect(headers.parse({ foo: 'foo', bar: 'bar', baz: 'baz' })).toEqual({
      foo: 'foo',
      bar: 'bar',
    });
  });

  it('should merge a non-strict and strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() });
    const routeHeaders = z.object({ bar: z.string() }).strict();
    const headers = zodMerge(baseHeaders, routeHeaders) as z.ZodSchema;

    expect(() =>
      headers.parse({ foo: 'foo', bar: 'bar', baz: 'baz' }),
    ).toThrowError('baz');
  });

  it('should merge a non-strict and non-strict schema', () => {
    const baseHeaders = z.object({ foo: z.string() });
    const routeHeaders = z.object({ bar: z.string() });
    const headers = zodMerge(baseHeaders, routeHeaders) as z.ZodSchema;

    expect(headers.parse({ foo: 'foo', bar: 'bar', baz: 'baz' })).toEqual({
      foo: 'foo',
      bar: 'bar',
    });
  });
});
