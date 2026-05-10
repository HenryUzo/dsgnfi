import { z } from "zod";

export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorPayload = {
  code: string;
  message: string;
  fieldErrors?: ApiFieldErrors;
};

export class ApiRequestError extends Error {
  statusCode: number;
  code: string;
  fieldErrors?: ApiFieldErrors;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fieldErrors?: ApiFieldErrors
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function apiError(
  code: string,
  message: string,
  fieldErrors?: ApiFieldErrors
): { ok: false; error: ApiErrorPayload } {
  return {
    ok: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  };
}

export function zodFieldErrors(error: z.ZodError): ApiFieldErrors {
  return error.issues.reduce<ApiFieldErrors>((acc, issue) => {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    acc[key] ??= [];
    acc[key].push(issue.message);
    return acc;
  }, {});
}

export function zodApiError(
  code: string,
  error: z.ZodError,
  fallbackMessage = "Please correct the highlighted fields."
) {
  return apiError(code, fallbackMessage, zodFieldErrors(error));
}
