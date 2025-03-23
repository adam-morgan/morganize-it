import { Request, Response } from "express";
import { HttpRequest } from "../http/request";
import { HttpHeaders } from "../http/headers";
import { ParsedUrlQuery } from "querystring";
import { HttpResponse } from "../http/response";

export const makeHttpRequest = <T>(expressReq: Request<T>): HttpRequest<T> => {
  const headers: Record<string, string | string[]> = {};
  for (const key in expressReq.headers) {
    if (typeof expressReq.headers[key] === "string") {
      headers[key] = expressReq.headers[key] as string;
    } else if (Array.isArray(expressReq.headers[key])) {
      headers[key] = expressReq.headers[key] as string[];
    }
  }

  return {
    method: expressReq.method,
    body: expressReq.body,
    headers: new HttpHeaders(headers),
    params: expressReq.params as { [key: string]: string },
    query: expressReq.query as ParsedUrlQuery,
    userId: expressReq.session?.userId,
  };
};

export const handleHttpResponseAsync = <T>(
  response: Promise<HttpResponse<T>>,
  expressResponse: Response<T>
): void => {
  response
    .then((httpResponse) => {
      handleHttpResponse(httpResponse, expressResponse);
    })
    .catch((e) => {
      console.error(e);
      expressResponse.status(500).json({ message: "Internal Server Error" } as T);
    });
};

export const handleHttpResponse = <T>(
  response: HttpResponse<T>,
  expressResponse: Response<T>
): void => {
  if (response.headers) {
    for (const key in response.headers) {
      expressResponse.setHeader(key, response.headers[key]);
    }
  }

  expressResponse.status(response.status);

  if (response.body != null) {
    if (typeof response.body === "string") {
      expressResponse.send(response.body);
    } else {
      expressResponse.json(response.body);
    }
  } else {
    expressResponse.end();
  }
};
