import { ParsedUrlQuery } from "querystring";
import { HttpHeaders } from "./headers";

export type HttpRequest<T> = {
  method: string;
  body: T;
  headers: HttpHeaders;
  query: ParsedUrlQuery;
  userId?: string;
};
