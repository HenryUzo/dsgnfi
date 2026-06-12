import { appendSiteOverrideToPublicPath } from "./siteOverride";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function getResolvedApiBaseUrl() {
  if (typeof window === "undefined" || !API_BASE_URL) {
    return API_BASE_URL;
  }

  try {
    const configuredUrl = new URL(API_BASE_URL, window.location.origin);
    const currentHost = window.location.hostname;
    const configuredHost = configuredUrl.hostname;
    const isLoopbackPair =
      (currentHost === "127.0.0.1" && configuredHost === "localhost") ||
      (currentHost === "localhost" && configuredHost === "127.0.0.1");

    if (isLoopbackPair) {
      configuredUrl.hostname = currentHost;
      return configuredUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return API_BASE_URL;
  }

  return API_BASE_URL;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    options: { code?: string; fieldErrors?: Record<string, string[]> } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiBaseUrl = getResolvedApiBaseUrl();
  const resolvedPath =
    typeof window === "undefined"
      ? path
      : appendSiteOverrideToPublicPath(path, window.location.search);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData && options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${apiBaseUrl}${resolvedPath}`, {
    ...options,
    headers,
    credentials: "include",
    cache: options.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let code: string | undefined;
    let fieldErrors: Record<string, string[]> | undefined;

    try {
      const data = (await response.json()) as ApiErrorResponse;
      message = data?.error?.message ?? data?.message ?? message;
      code = data?.error?.code;
      fieldErrors = data?.error?.fieldErrors;
    } catch {
      // ignore JSON parse errors
    }

    throw new ApiError(message, response.status, { code, fieldErrors });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
