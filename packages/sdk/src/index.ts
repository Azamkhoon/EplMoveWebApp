import type {
  AuthTokens,
  CreateLoadInput,
  Load,
  LoadStatus,
  LoginInput,
  RegisterInput,
  UpdateLoadInput,
} from "@epl/contracts";

/**
 * Typed client for the EPL Move API gateway. Shares contract types with the
 * backend (no drift). Used by the web apps.
 *
 * Access token is held in memory; the refresh token is an httpOnly cookie set
 * by auth-svc, so refresh() works via credentials: "include".
 */
export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown; traceId?: string };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface EplClientOptions {
  baseUrl: string;
  onTokenChange?: (token: string | null) => void;
}

export class EplClient {
  private accessToken: string | null = null;
  private readonly baseUrl: string;
  private readonly onTokenChange?: (t: string | null) => void;

  constructor(opts: EplClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.onTokenChange = opts.onTokenChange;
  }

  setToken(token: string | null) {
    this.accessToken = token;
    this.onTokenChange?.(token);
  }

  getToken() {
    return this.accessToken;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: boolean } = {},
  ): Promise<T> {
    const { auth = true, headers, ...rest } = init;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(auth && this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        ...headers,
      },
    });

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = (body as ApiErrorShape).error;
      throw new ApiError(res.status, e?.code ?? "ERROR", e?.message ?? res.statusText, e?.details);
    }
    return body as T;
  }

  // ── Auth ──
  async register(input: RegisterInput): Promise<AuthTokens> {
    const t = await this.request<AuthTokens>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(input),
    });
    this.setToken(t.accessToken);
    return t;
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const t = await this.request<AuthTokens>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(input),
    });
    this.setToken(t.accessToken);
    return t;
  }

  async requestOtp(email: string): Promise<{ devCode?: string }> {
    return this.request("/auth/otp/request", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    });
  }

  async verifyOtp(email: string, code: string): Promise<AuthTokens> {
    const t = await this.request<AuthTokens>("/auth/otp/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, code }),
    });
    this.setToken(t.accessToken);
    return t;
  }

  async refresh(): Promise<AuthTokens | null> {
    try {
      const t = await this.request<AuthTokens>("/auth/refresh", { method: "POST", auth: false });
      this.setToken(t.accessToken);
      return t;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", { method: "POST", auth: false }).catch(() => undefined);
    this.setToken(null);
  }

  // ── Loads ──
  listLoads(params?: { status?: LoadStatus; limit?: number }): Promise<Load[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return this.request<Load[]>(`/loads${suffix}`);
  }

  getLoad(id: string): Promise<Load> {
    return this.request<Load>(`/loads/${id}`);
  }

  createLoad(input: CreateLoadInput): Promise<Load> {
    return this.request<Load>("/loads", { method: "POST", body: JSON.stringify(input) });
  }

  updateLoad(id: string, input: UpdateLoadInput): Promise<Load> {
    return this.request<Load>(`/loads/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  cancelLoad(id: string): Promise<Load> {
    return this.request<Load>(`/loads/${id}/cancel`, { method: "POST" });
  }

  duplicateLoad(id: string): Promise<Load> {
    return this.request<Load>(`/loads/${id}/duplicate`, { method: "POST" });
  }
}

export type { Load, LoadStatus, CreateLoadInput, UpdateLoadInput, AuthTokens } from "@epl/contracts";
