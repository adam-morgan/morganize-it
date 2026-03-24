import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { ReactiveRoutes } from "../http/reactive-routes";
import { makeHttpRequestFromEvent, toLambdaResponse } from "./util";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

const handleError = (err: unknown): APIGatewayProxyResultV2 => {
  const error = err as Error;
  const code = (error as any).code;
  const status = code && typeof code === "number" && code <= 511 ? code : 500;
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: error.message ?? "Internal Server Error" }),
  };
};

export const createFindHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<FindOptions>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.find(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};

export const createFindByIdHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<T>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.findById(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};

export const createCreateHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<T>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.create(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};

export const createUpdateHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<T>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.update(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};

export const createPatchHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<T>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.patch(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};

export const createDeleteHandler = <T extends Entity>(
  reactiveRoutes: ReactiveRoutes<T>
) => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      const req = makeHttpRequestFromEvent<T>(event, event.auth?.userId);
      const response = await firstValueFrom(reactiveRoutes.delete(req));
      return toLambdaResponse(response);
    } catch (err) {
      return handleError(err);
    }
  };
};
