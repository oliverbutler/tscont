import {
  AppRoute,
  AppRouter,
  ApiRouteResponse,
  Without,
  getRouteResponses,
} from '@ts-rest/core';
import { ApiDecoratorShape } from './api.decorator';

type AppRouterMethodShape<
  T extends AppRoute,
  ValidateRoute extends boolean = false
> = (
  ...args: any[]
) => Promise<ApiRouteResponse<T['responses'], ValidateRoute>>;

type AppRouterControllerShape<
  T extends AppRouter,
  ValidateRoute extends boolean = false
> = {
  [K in keyof T]: T[K] extends AppRouter
    ? undefined
    : T[K] extends AppRoute
    ? AppRouterMethodShape<T[K], ValidateRoute>
    : never;
};

type AppRouteShape<T extends AppRouter> = {
  [K in keyof T]: T[K] extends AppRouter
    ? AppRouteShape<T[K]>
    : T[K] extends AppRoute
    ? ApiDecoratorShape<T[K]>
    : never;
};

export type NestControllerShapeFromAppRouter<
  T extends AppRouter,
  ValidateRoute extends boolean = false
> = Without<AppRouterControllerShape<T, ValidateRoute>, AppRouter>;

export type NestAppRouteShape<T extends AppRouter> = AppRouteShape<T>;

export type InitServerOptions = {
  parseResponses: boolean;
};

export const initNestServer = <T extends AppRouter>(
  router: T,
  options: InitServerOptions = { parseResponses: true }
) => {
  return {
    controllerShape: {} as NestControllerShapeFromAppRouter<
      T,
      typeof options.parseResponses
    >,
    routeShapes: {} as NestAppRouteShape<T>,
    responseShapes: getRouteResponses(router, options.parseResponses),
    route: router,
  };
};
