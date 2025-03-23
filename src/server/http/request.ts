import { ParsedUrlQuery } from "querystring";
import { HttpHeaders } from "./headers";

export type HttpRequest<T> = {
  method: string;
  body: T;
  headers: HttpHeaders;
  params: { [key: string]: string };
  query: ParsedUrlQuery;
  userId?: string;
};
