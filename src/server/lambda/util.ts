import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { HttpRequest } from "../http/request";
import { HttpHeaders } from "../http/headers";
import { HttpResponse } from "../http/response";
import { ParsedUrlQuery } from "querystring";

export const makeHttpRequestFromEvent = <T>(
  event: APIGatewayProxyEventV2,
  userId?: string
): HttpRequest<T> => {
  let body: T | undefined;
  if (event.body) {
    try {
      body = JSON.parse(event.body) as T;
    } catch {
      body = event.body as unknown as T;
    }
  }

  const query: ParsedUrlQuery = {};
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value !== undefined) {
        query[key] = value;
      }
    }
  }

  return {
    method: event.requestContext.http.method,
    body: body as T,
    headers: new HttpHeaders(event.headers as Record<string, string>),
    params: (event.pathParameters ?? {}) as Record<string, string>,
    query,
    userId,
  };
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "0",
};

export const toLambdaResponse = <T>(response: HttpResponse<T>): APIGatewayProxyResultV2 => {
  const result: APIGatewayProxyResultV2 = {
    statusCode: response.status,
    headers: {
      "Content-Type": "application/json",
      ...securityHeaders,
      ...(response.headers ?? {}),
    },
  };

  if (response.body != null) {
    result.body = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  }

  return result;
};
