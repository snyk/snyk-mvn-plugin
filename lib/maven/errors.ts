/**
 * Helper function to ensure we have an Error object
 */
function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

export class DependencyTreeError extends Error {
  public readonly command: string;
  public readonly args: string[];
  public readonly originalError: Error;

  constructor(command: string, args: string[], originalError: unknown) {
    const error = ensureError(originalError);
    // We don't actually use the message, but Error requires one
    super('Maven dependency tree execution failed');
    this.name = 'DependencyTreeError';
    this.command = command;
    this.args = args;
    this.originalError = error;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DependencyTreeError);
    }
  }
}
