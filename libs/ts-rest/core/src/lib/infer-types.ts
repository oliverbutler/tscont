import {
  AppRoute,
  AppRouteMutation,
  AppRouter,
  AppRouteStrictStatusCodes,
  ContractAnyType,
  ContractNoBodyType,
  ContractOtherResponse,
} from './dsl';
import { HTTPStatusCode } from './status-codes';
import {
  And,
  Extends,
  LowercaseKeys,
  Merge,
  Not,
  OptionalIfAllOptional,
  Or,
  PartialByLooseKeys,
  Prettify,
  Without,
  SchemaOutputOrType,
  SchemaInputOrType,
} from './type-utils';
import {
  ApiFetcher,
  ClientArgs,
  OverrideableClientArgs,
  FetchOptions,
} from './client';
import { ParamsFromUrl } from './paths';

type ExtractExtraParametersFromClientArgs<
  TClientArgs extends Pick<ClientArgs, 'api'>,
> = TClientArgs['api'] extends ApiFetcher
  ? Omit<Parameters<TClientArgs['api']>[0], keyof Parameters<ApiFetcher>[0]>
  : {};

/**
 * Extract the path params from the path in the contract
 */
type PathParamsFromUrl<T extends AppRoute> = ParamsFromUrl<
  T['path']
> extends infer U
  ? U
  : never;

/**
 * Merge `PathParamsFromUrl<T>` with pathParams schema if it exists
 */
type PathParamsWithCustomValidators<
  T extends AppRoute,
  TClientOrServer extends 'client' | 'server' = 'server',
> = 'pathParams' extends keyof T
  ? Merge<
      PathParamsFromUrl<T>,
      TClientOrServer extends 'server'
        ? SchemaOutputOrType<T['pathParams']>
        : SchemaInputOrType<T['pathParams']>
    >
  : PathParamsFromUrl<T>;

export type ResolveResponseType<
  T extends
    | ContractAnyType
    | ContractNoBodyType
    | ContractOtherResponse<ContractAnyType>,
> = T extends ContractOtherResponse<infer U> ? U : T;

export type InferResponseDefinedStatusCodes<
  T extends AppRoute,
  TStatus extends HTTPStatusCode = HTTPStatusCode,
> = {
  [K in keyof T['responses'] & TStatus]: K;
}[keyof T['responses'] & TStatus];

export type InferResponseUndefinedStatusCodes<
  T extends AppRoute,
  TStatus extends HTTPStatusCode = HTTPStatusCode,
> = Exclude<TStatus, InferResponseDefinedStatusCodes<T, TStatus>>;

type AppRouteResponses<
  T extends AppRoute,
  TStatus extends HTTPStatusCode,
  TClientOrServer extends 'client' | 'server',
  TStrictStatusCodes extends 'default' | 'ignore' | 'force' = 'default',
> =
  | {
      [K in keyof T['responses'] & TStatus]: {
        status: K;
        body: TClientOrServer extends 'server'
          ? SchemaInputOrType<ResolveResponseType<T['responses'][K]>>
          : SchemaOutputOrType<ResolveResponseType<T['responses'][K]>>;
      } & (TClientOrServer extends 'client'
        ? {
            headers: Headers;
          }
        : {});
    }[keyof T['responses'] & TStatus]
  | (Or<
      Extends<TStrictStatusCodes, 'force'>,
      And<
        Extends<T, AppRouteStrictStatusCodes>,
        Not<Extends<TStrictStatusCodes, 'ignore'>>
      >
    > extends true
      ? never
      : Exclude<TStatus, keyof T['responses']> extends never
      ? never
      : {
          status: Exclude<TStatus, keyof T['responses']>;
          body: unknown;
        } & (TClientOrServer extends 'client'
          ? {
              headers: Headers;
            }
          : {}));

export type ServerInferResponses<
  T extends AppRoute | AppRouter,
  TStatus extends HTTPStatusCode = HTTPStatusCode,
  TStrictStatusCodes extends 'default' | 'ignore' | 'force' = 'default',
> = T extends AppRoute
  ? Prettify<AppRouteResponses<T, TStatus, 'server', TStrictStatusCodes>>
  : T extends AppRouter
  ? {
      [TKey in keyof T]: ServerInferResponses<
        T[TKey],
        TStatus,
        TStrictStatusCodes
      >;
    }
  : never;

export type ClientInferResponses<
  T extends AppRoute | AppRouter,
  TStatus extends HTTPStatusCode = HTTPStatusCode,
  TStrictStatusCodes extends 'default' | 'ignore' | 'force' = 'default',
> = T extends AppRoute
  ? Prettify<AppRouteResponses<T, TStatus, 'client', TStrictStatusCodes>>
  : T extends AppRouter
  ? {
      [TKey in keyof T]: ClientInferResponses<
        T[TKey],
        TStatus,
        TStrictStatusCodes
      >;
    }
  : never;

export type ServerInferResponseBody<
  T extends AppRoute,
  TStatus extends keyof T['responses'] = keyof T['responses'],
> = Prettify<AppRouteResponses<T, TStatus & HTTPStatusCode, 'server'>['body']>;

export type ClientInferResponseBody<
  T extends AppRoute,
  TStatus extends keyof T['responses'] = keyof T['responses'],
> = Prettify<AppRouteResponses<T, TStatus & HTTPStatusCode, 'client'>['body']>;

type BodyWithoutFileIfMultiPart<T extends AppRouteMutation> =
  T['contentType'] extends 'multipart/form-data'
    ? Without<SchemaOutputOrType<T['body']>, File | File[]>
    : SchemaOutputOrType<T['body']>;

export type ServerInferRequest<
  T extends AppRoute | AppRouter,
  TServerHeaders = never,
> = T extends AppRoute
  ? Prettify<
      Without<
        {
          params: [keyof PathParamsWithCustomValidators<T>] extends [never]
            ? never
            : Prettify<PathParamsWithCustomValidators<T>>;
          body: T extends AppRouteMutation
            ? BodyWithoutFileIfMultiPart<T>
            : never;
          query: 'query' extends keyof T
            ? SchemaOutputOrType<T['query']>
            : never;
          headers: 'headers' extends keyof T
            ? Prettify<
                LowercaseKeys<SchemaOutputOrType<T['headers']>> &
                  ([TServerHeaders] extends [never]
                    ? {}
                    : Omit<
                        TServerHeaders,
                        keyof LowercaseKeys<SchemaOutputOrType<T['headers']>>
                      >)
              >
            : TServerHeaders;
        },
        never
      >
    >
  : T extends AppRouter
  ? { [TKey in keyof T]: ServerInferRequest<T[TKey], TServerHeaders> }
  : never;

type ClientInferRequestBase<
  T extends AppRoute,
  TClientArgs extends Omit<ClientArgs, 'baseUrl'> = {},
  THeaders = 'headers' extends keyof T
    ? Prettify<
        PartialByLooseKeys<
          LowercaseKeys<SchemaInputOrType<T['headers']>>,
          keyof LowercaseKeys<TClientArgs['baseHeaders']>
        >
      >
    : never,
  TFetchOptions extends FetchOptions = FetchOptions,
> = Prettify<
  Without<
    {
      params: [keyof PathParamsWithCustomValidators<T, 'client'>] extends [
        never,
      ]
        ? never
        : Prettify<PathParamsWithCustomValidators<T, 'client'>>;
      body: T extends AppRouteMutation
        ? T['body'] extends null
          ? never
          : T['contentType'] extends 'multipart/form-data'
          ? FormData | SchemaInputOrType<T['body']>
          : T['contentType'] extends 'application/x-www-form-urlencoded'
          ? string | SchemaInputOrType<T['body']>
          : SchemaInputOrType<T['body']>
        : never;
      query: 'query' extends keyof T
        ? T['query'] extends null
          ? never
          : SchemaInputOrType<T['query']>
        : never;
      headers: THeaders;
      extraHeaders?: [THeaders] extends [never]
        ? Record<string, string | undefined>
        : {
            [K in NonNullable<keyof THeaders>]?: never;
          } & Record<string, string | undefined>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;

      /**
       * @deprecated Use `fetchOptions.cache` instead
       */
      cache?: 'cache' extends keyof TFetchOptions
        ? TFetchOptions['cache']
        : never;

      /**
       * @deprecated Use `fetchOptions.next` instead
       */
      next?: 'next' extends keyof TFetchOptions ? TFetchOptions['next'] : never;
    } & ExtractExtraParametersFromClientArgs<TClientArgs>,
    never
  >
>;

export type ClientInferRequest<
  T extends AppRoute | AppRouter,
  TClientArgs extends Omit<ClientArgs, 'baseUrl'> = {},
> = T extends AppRoute
  ? ClientInferRequestBase<T, TClientArgs>
  : T extends AppRouter
  ? { [TKey in keyof T]: ClientInferRequest<T[TKey]> }
  : never;

export type PartialClientInferRequest<
  TRoute extends AppRoute,
  TClientArgs extends Omit<ClientArgs, 'baseUrl'> = {},
> = OptionalIfAllOptional<ClientInferRequest<TRoute, TClientArgs>>;
