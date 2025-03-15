export type HttpResponse<T> = {
  status: number;
  body?: T;
  headers?: Record<string, string>;
};
