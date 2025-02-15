import { ContractNoBodyType, ContractNullType, ContractPlainType } from './dsl';
import { StandardSchemaV1 } from './standard-schema';

type GetIndexedField<T, K> = K extends keyof T
  ? T[K]
  : K extends `${number}`
  ? '0' extends keyof T
    ? undefined
    : number extends keyof T
    ? T[number]
    : undefined
  : undefined;

type FieldWithPossiblyUndefined<T, Key> =
  | GetFieldType<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

type IndexedFieldWithPossiblyUndefined<T, Key> =
  | GetIndexedField<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

export type GetFieldType<T, P> = P extends `${infer Left}.${infer Right}`
  ? Left extends keyof T
    ? FieldWithPossiblyUndefined<T[Left], Right>
    : Left extends `${infer FieldKey}[${infer IndexKey}]`
    ? FieldKey extends keyof T
      ? FieldWithPossiblyUndefined<
          IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>,
          Right
        >
      : undefined
    : undefined
  : P extends keyof T
  ? T[P]
  : P extends `${infer FieldKey}[${infer IndexKey}]`
  ? FieldKey extends keyof T
    ? IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>
    : undefined
  : undefined;

// https://stackoverflow.com/questions/63447660/typescript-remove-all-properties-with-particular-type
// Nested solution also available ^
type ExcludeKeysWithTypeOf<T, V> = {
  [K in keyof T]-?: [Exclude<T[K], undefined>] extends [V] ? never : K;
}[keyof T];

type ExcludeKeysWithoutTypeOf<T, V> = {
  [K in keyof T]-?: [Exclude<T[K], undefined>] extends [V] ? K : never;
}[keyof T];

export type Without<T, V> = Pick<T, ExcludeKeysWithTypeOf<T, V>>;
export type With<T, V> = Pick<T, ExcludeKeysWithoutTypeOf<T, V>>;

export type SchemaOutputOrType<T> = T extends ContractNullType
  ? null
  : T extends ContractNoBodyType
  ? undefined
  : T extends ContractPlainType<infer U>
  ? U
  : T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T;

/** @deprecated use SchemaOutputOrType */
export type ZodInferOrType<T> = SchemaOutputOrType<T>;

export type SchemaInputOrType<T> = T extends ContractNullType
  ? null
  : T extends ContractNoBodyType
  ? undefined
  : T extends ContractPlainType<infer U>
  ? U
  : T extends StandardSchemaV1
  ? StandardSchemaV1.InferInput<T>
  : T;

/** @deprecated use SchemaInputOrType */
export type ZodInputOrType<T> = SchemaInputOrType<T>;

export type Merge<T, U> = Omit<T, keyof U> & U;

type Try<A, B, C> = A extends B ? A : C;

type NarrowRaw<T> =
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (T extends Function ? T : never)
  | (T extends string | number | bigint | boolean ? T : never)
  | (T extends [] ? [] : never)
  | {
      [K in keyof T]: K extends 'description' ? T[K] : NarrowNotSchema<T[K]>;
    };

type NarrowNotSchema<T> = Try<T, StandardSchemaV1, NarrowRaw<T>>;

export type Narrow<T> = Try<T, [], NarrowNotSchema<T>>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PartialByLooseKeys<T, K> = Omit<T, K extends keyof T ? K : never> &
  Partial<Pick<T, K extends keyof T ? K : never>>;

// https://github.com/ts-essentials/ts-essentials/blob/4c451652ba7c20b0e0b965e0b7755fd4d7844127/lib/types.ts#L228
type OptionalKeys<T> = T extends unknown
  ? {
      [K in keyof T]-?: undefined extends { [K2 in keyof T]: K2 }[K]
        ? K
        : never;
    }[keyof T]
  : never;

// TODO: Replace all usages of this with IfAllPropertiesOptional
export type AreAllPropertiesOptional<T> = T extends Record<string, unknown>
  ? Exclude<keyof T, OptionalKeys<T>> extends never
    ? true
    : false
  : false;

export type IfAllPropertiesOptional<T, TIf, TElse> = T extends Record<
  string,
  unknown
>
  ? Exclude<keyof T, OptionalKeys<T>> extends never
    ? TIf
    : TElse
  : TElse;

export type OptionalIfAllOptional<
  T,
  Select extends keyof T = keyof T,
> = PartialBy<
  T,
  Select &
    {
      [K in keyof T]: AreAllPropertiesOptional<T[K]> extends true ? K : never;
    }[keyof T]
>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DefinedOrEmpty<
  T,
  K extends keyof NonNullable<T>,
> = undefined extends T ? {} : NonNullable<T>[K];

declare const tag: unique symbol;

declare type Tagged<Token> = {
  readonly [tag]: Token;
};

export type Opaque<Type, Token = unknown> = Type & Tagged<Token>;

export type UnwrapOpaque<OpaqueType extends Tagged<unknown>> =
  OpaqueType extends Opaque<infer Type, OpaqueType[typeof tag]>
    ? Type
    : OpaqueType;

export type WithoutUnknown<T> = Pick<
  T,
  {
    [K in keyof T]: unknown extends Exclude<T[K], undefined> ? never : K;
  }[keyof T]
>;

export type LowercaseKeys<T> = Prettify<{
  [K in keyof T as K extends string ? Lowercase<K> : K]: T[K];
}>;

export type Extends<T, U> = T extends U ? true : false;

export type And<B1 extends boolean, B2 extends boolean> = {
  false: {
    false: false;
    true: false;
  };
  true: {
    false: false;
    true: true;
  };
}[`${B1}`][`${B2}`];

export type Or<B1 extends boolean, B2 extends boolean> = {
  false: {
    false: false;
    true: true;
  };
  true: {
    false: true;
    true: true;
  };
}[`${B1}`][`${B2}`];

export type Not<B extends boolean> = {
  false: true;
  true: false;
}[`${B}`];

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type CommonKeys<T, R = {}> = R extends T
  ? keyof T & CommonKeys<Exclude<T, R>>
  : keyof T;

type Common<T> = Pick<T, CommonKeys<T>>;

type RemoveUnionProperties<T> = {
  [TKey in keyof T as [T[TKey]] extends [UnionToIntersection<T[TKey]>]
    ? TKey
    : never]: T[TKey];
};

export type CommonAndEqual<T> = RemoveUnionProperties<Common<T>>;
