export class CustomError extends Error {
  public innerError?: Error;
  public statusCode?: number;

  public constructor(message: string, statusCode?: number) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.innerError = undefined;
    this.statusCode = statusCode;
  }
}
