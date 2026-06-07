import type {
  AuthTokens,
  Carrier,
  CreateLoadInput,
  CreateQuoteInput,
  Load,
  LoadStatus,
  LoginInput,
  Quote,
  RegisterInput,
  Shipment,
  ShipmentDocument,
  SubmitBidInput,
  TrackingState,
  UpdateLoadInput,
  UploadDocumentInput,
  GeniusAnswer,
  AskInput,
  RateEstimate,
  RateEstimateInput,
  RouteOptimizeInput,
  RouteOptimizeResult,
  DocAssistInput,
  DocAssistResult,
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

  // ── Quotes & bids ──
  listQuotes(): Promise<Quote[]> {
    return this.request<Quote[]>("/quotes");
  }

  getQuote(id: string): Promise<Quote> {
    return this.request<Quote>(`/quotes/${id}`);
  }

  createQuote(input: CreateQuoteInput): Promise<Quote> {
    return this.request<Quote>("/quotes", { method: "POST", body: JSON.stringify(input) });
  }

  submitBid(quoteId: string, input: SubmitBidInput): Promise<unknown> {
    return this.request(`/quotes/${quoteId}/bids`, { method: "POST", body: JSON.stringify(input) });
  }

  acceptBid(quoteId: string, bidId: string): Promise<Quote> {
    return this.request<Quote>(`/quotes/${quoteId}/bids/${bidId}/accept`, { method: "POST" });
  }

  // ── Shipments ──
  listShipments(): Promise<Shipment[]> {
    return this.request<Shipment[]>("/shipments");
  }

  getShipment(id: string): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${id}`);
  }

  // ── Carriers ──
  listCarriers(mode?: string): Promise<Carrier[]> {
    const qs = mode ? `?mode=${encodeURIComponent(mode)}` : "";
    return this.request<Carrier[]>(`/carriers${qs}`);
  }

  rateCarrier(id: string, stars: number, comment?: string): Promise<Carrier> {
    return this.request<Carrier>(`/carriers/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    });
  }

  // ── Tracking ──
  getTrackingState(shipmentId: string): Promise<TrackingState> {
    return this.request<TrackingState>(`/tracking/${shipmentId}`);
  }

  getTrackingHistory(shipmentId: string): Promise<
    { lat: number; lng: number; reportedAt: string }[]
  > {
    return this.request(`/tracking/${shipmentId}/history`);
  }

  reportPosition(
    shipmentId: string,
    pos: { lat: number; lng: number; speedKph?: number; headingDeg?: number },
  ): Promise<TrackingState> {
    return this.request<TrackingState>(`/tracking/${shipmentId}/positions`, {
      method: "POST",
      body: JSON.stringify(pos),
    });
  }

  /** Open a live position WebSocket. Returns a closer; pushes TrackingState. */
  openTrackingStream(onState: (s: TrackingState) => void): () => void {
    const base = this.baseUrl.replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws/tracking?token=${encodeURIComponent(this.accessToken ?? "")}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "position") onState(msg.state as TrackingState);
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => ws.close();
  }

  // ── Documents ──
  listDocuments(params?: { shipmentId?: string; type?: string }): Promise<ShipmentDocument[]> {
    const qs = new URLSearchParams();
    if (params?.shipmentId) qs.set("shipmentId", params.shipmentId);
    if (params?.type) qs.set("type", params.type);
    const suffix = qs.toString() ? `?${qs}` : "";
    return this.request<ShipmentDocument[]>(`/documents${suffix}`);
  }

  uploadDocument(input: UploadDocumentInput): Promise<ShipmentDocument> {
    return this.request<ShipmentDocument>("/documents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  verifyDocument(id: string): Promise<ShipmentDocument> {
    return this.request<ShipmentDocument>(`/documents/${id}/verify`, { method: "POST" });
  }

  confirmDelivery(shipmentId: string): Promise<ShipmentDocument> {
    return this.request<ShipmentDocument>(`/documents/shipments/${shipmentId}/pod`, { method: "POST" });
  }

  documentDownloadUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/download`;
  }

  // ── EPL Genius ──
  askGenius(input: AskInput): Promise<GeniusAnswer> {
    return this.request<GeniusAnswer>("/genius/ask", { method: "POST", body: JSON.stringify(input) });
  }

  estimateRate(input: RateEstimateInput): Promise<RateEstimate> {
    return this.request<RateEstimate>("/genius/rate-estimate", { method: "POST", body: JSON.stringify(input) });
  }

  optimizeRoute(input: RouteOptimizeInput): Promise<RouteOptimizeResult> {
    return this.request<RouteOptimizeResult>("/genius/route-optimize", { method: "POST", body: JSON.stringify(input) });
  }

  docAssist(input: DocAssistInput): Promise<DocAssistResult> {
    return this.request<DocAssistResult>("/genius/doc-assist", { method: "POST", body: JSON.stringify(input) });
  }
}

export type {
  Load,
  LoadStatus,
  CreateLoadInput,
  UpdateLoadInput,
  AuthTokens,
  Quote,
  CreateQuoteInput,
  Shipment,
  Carrier,
  TrackingState,
  ShipmentDocument,
  UploadDocumentInput,
  DocumentType,
  GeniusAnswer,
  RateEstimate,
  RouteOptimizeResult,
  DocAssistResult,
} from "@epl/contracts";
