export function getProductionSafeErrorMessage(
  error: Error | null | undefined,
  fallback: string,
) {
  if (process.env.NODE_ENV !== "production" && error?.message) {
    return error.message;
  }

  return fallback;
}

export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof PublicError) {
    return error.message;
  }

  return getProductionSafeErrorMessage(error instanceof Error ? error : null, fallback);
}
