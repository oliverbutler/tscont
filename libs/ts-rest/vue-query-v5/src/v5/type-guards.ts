import {
  AppRoute,
  ClientInferResponses,
  ErrorHttpStatusCode,
  InferResponseUndefinedStatusCodes,
  exhaustiveGuard as coreExhaustiveGuard,
  isErrorResponse as isCoreErrorResponse,
  SuccessfulHttpStatusCode,
  isResponse as isCoreResponse,
  isSuccessResponse as isCoreSuccesResponse,
  isUnknownResponse as isCoreUnknownResponse,
  isUnknownSuccessResponse as isCoreUnknownSuccessResponse,
  isUnknownErrorResponse as isCoreUnknownErrorResponse,
  HTTPStatusCode,
} from '@ts-rest/core';
import { type MaybeRef, unref } from 'vue-demi';

type FetchError = Error;

type UnknownResponseError<T extends AppRoute> = ClientInferResponses<
  T,
  InferResponseUndefinedStatusCodes<T, ErrorHttpStatusCode>,
  'ignore'
>;

type NotKnownResponseError<T extends AppRoute> =
  | FetchError
  | UnknownResponseError<T>;

export const isResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint?: T,
): response is MaybeRef<ClientInferResponses<T, HTTPStatusCode>> => {
  return isCoreResponse(unref(response), contractEndpoint);
};

export const isSuccessResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint?: T,
): response is MaybeRef<ClientInferResponses<T, SuccessfulHttpStatusCode>> => {
  const _response = unref(response);
  return isCoreSuccesResponse(_response, contractEndpoint);
};

export const isErrorResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint: T,
): response is MaybeRef<ClientInferResponses<T, ErrorHttpStatusCode>> => {
  return isCoreErrorResponse(unref(response), contractEndpoint);
};

export const isUnknownResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint: T,
): response is MaybeRef<
  ClientInferResponses<T, InferResponseUndefinedStatusCodes<T>, 'ignore'>
> => {
  return isCoreUnknownResponse(unref(response), contractEndpoint);
};

export const isUnknownSuccessResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint: T,
): response is MaybeRef<
  ClientInferResponses<
    T,
    InferResponseUndefinedStatusCodes<T, SuccessfulHttpStatusCode>,
    'ignore'
  >
> => {
  return isCoreUnknownSuccessResponse(unref(response), contractEndpoint);
};

export const isUnknownErrorResponse = <T extends AppRoute>(
  response: MaybeRef<unknown>,
  contractEndpoint: T,
): response is MaybeRef<
  ClientInferResponses<
    T,
    InferResponseUndefinedStatusCodes<T, ErrorHttpStatusCode>,
    'ignore'
  >
> => {
  return isCoreUnknownErrorResponse(response, contractEndpoint);
};

export const exhaustiveGuard = <T extends { status: never }>(
  response: MaybeRef<T>,
): never => {
  return coreExhaustiveGuard(unref(response));
};

export const isFetchError = (
  error: MaybeRef<unknown>,
): error is MaybeRef<FetchError> => {
  return unref(error) instanceof Error;
};

export const isNotKnownResponseError = <T extends AppRoute>(
  error: MaybeRef<unknown>,
  contractEndpoint: T,
): error is MaybeRef<NotKnownResponseError<T>> => {
  const _error = unref(error);
  return (
    isFetchError(_error) || isUnknownErrorResponse(_error, contractEndpoint)
  );
};
