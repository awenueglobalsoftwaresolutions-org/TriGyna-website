export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

export const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("trigyna_token");
};

export const setToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("trigyna_token", token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("trigyna_token");
    localStorage.removeItem("trigyna_user");
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = baseUrl.replace(/\/+$/, "");
  if (base.endsWith("/api/v1") && cleanEndpoint.startsWith("/api/v1")) {
    cleanEndpoint = cleanEndpoint.substring("/api/v1".length);
  }
  const url = `${base}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const body: ApiResponse<T> = await res.json().catch(() => ({
      success: res.ok,
      data: {} as T,
      message: res.statusText,
    }));

    if (!res.ok) {
      const errorMsg = body.error?.message || body.message || `Request failed with status ${res.status}`;
      throw new ApiError(errorMsg, res.status, body);
    }

    return body;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : "Failed to connect to TriGyna API",
      0
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};
