import { CustomError } from './custom-error';

export class CallGraphError extends CustomError {
  public readonly innerError;

  public constructor(message: string, innerError: Error) {
    super(message);
    this.innerError = innerError;
  }
}
