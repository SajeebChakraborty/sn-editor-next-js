/**
 * Domain errors with stable codes for API mapping.
 */
export class SnEditorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'SnEditorError';
  }
}

export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new SnEditorError(`${message}: ${String(value)}`, 'ASSERT_NEVER', 500);
}
