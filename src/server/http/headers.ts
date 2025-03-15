export class HttpHeaders {
  private headers: Record<string, string | string[]>;

  constructor(headers: Record<string, string | string[]>) {
    this.headers = Object.entries(headers).reduce(
      (acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
      },
      {} as Record<string, string | string[]>
    );
  }

  get(key: string): string | string[] | undefined {
    return this.headers[key.toLowerCase()];
  }

  set(key: string, value: string | string[]): void {
    this.headers[key.toLowerCase()] = value;
  }

  remove(key: string): void {
    delete this.headers[key.toLowerCase()];
  }

  toObject(): Record<string, string | string[]> {
    return this.headers;
  }
}
