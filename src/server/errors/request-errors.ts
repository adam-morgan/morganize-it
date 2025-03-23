export class BadRequestError extends Error {
  public code: number;

  constructor(message: string) {
    super(message);
    this.code = 400;
  }
}

export class UnauthorizedError extends Error {
  public code: number;

  constructor(message: string) {
    super(message);
    this.code = 401;
  }
}

export class ForbiddenError extends Error {
  public code: number;

  constructor(message: string) {
    super(message);
    this.code = 403;
  }
}

export class NotFoundError extends Error {
  public code: number;

  constructor(message: string) {
    super(message);
    this.code = 404;
  }
}
