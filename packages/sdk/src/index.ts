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
  MarketplaceQuote,
  CarrierBidInput,
  UpdateCarrierBidInput,
  CarrierBid,
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
  Invoice,
  Notification,
  AssignBrokerInput,
  UpdateShipmentStatusInput,
  DocumentRequest,
  CreateDocumentRequestInput,
  ReviewDocumentRequestInput,
  ShipmentMessage,
  SendShipmentMessageInput,
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
  portal?: "shipper" | "carrier" | "broker" | "admin";
  onTokenChange?: (token: string | null) => void;
}

export class EplClient {
  private accessToken: string | null = null;
  private readonly baseUrl: string;
  private readonly portal?: EplClientOptions["portal"];
  private readonly onTokenChange?: (t: string | null) => void;

  constructor(opts: EplClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.portal = opts.portal;
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
    init: RequestInit & { auth?: boolean; retryAuth?: boolean } = {},
  ): Promise<T> {
    const { auth = true, retryAuth = true, headers, ...rest } = init;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(this.portal ? { "x-epl-portal": this.portal } : {}),
        ...(auth && this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        ...headers,
      },
    });

    // All portals share the same refresh-cookie based session. Transparently
    // renew an expired access token once so ordinary page actions do not fail
    // just because a short-lived JWT elapsed while another portal was open.
    if (res.status === 401 && auth && retryAuth) {
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.request<T>(path, { ...rest, headers, auth, retryAuth: false });
      }
    }

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = (body as ApiErrorShape).error;
      throw new ApiError(res.status, e?.code ?? "ERROR", e?.message ?? res.statusText, e?.details);
    }
    return body as T;
  }

  // ── Auth ──
  // `kind` is optional here (defaults to "shipper" server-side) so shipper
  // callers don't have to pass it; carrier portals send kind:"carrier".
  async register(input: Omit<RegisterInput, "kind"> & { kind?: "shipper" | "carrier" | "broker" }): Promise<AuthTokens> {
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

  rejectBid(quoteId: string, bidId: string): Promise<Quote> {
    return this.request<Quote>(`/quotes/${quoteId}/bids/${bidId}/reject`, { method: "POST" });
  }

  // ── Carrier marketplace (two-sided) ──
  /** Open quotes across all shippers (carrier view). */
  listOpenQuotes(): Promise<MarketplaceQuote[]> {
    return this.request<MarketplaceQuote[]>("/marketplace/quotes");
  }

  /** The carrier's own bids, with quote reference + status. */
  listMyBids(): Promise<CarrierBid[]> {
    return this.request<CarrierBid[]>("/marketplace/bids");
  }

  /** Submit (or replace) a bid on an open quote as a carrier. */
  submitMarketplaceBid(quoteId: string, input: CarrierBidInput): Promise<CarrierBid> {
    return this.request<CarrierBid>(`/marketplace/quotes/${quoteId}/bids`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateMarketplaceBid(bidId: string, input: UpdateCarrierBidInput): Promise<CarrierBid> {
    return this.request<CarrierBid>(`/marketplace/bids/${bidId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  withdrawMarketplaceBid(bidId: string): Promise<CarrierBid> {
    return this.request<CarrierBid>(`/marketplace/bids/${bidId}`, { method: "DELETE" });
  }

  // ── Shipments ──
  listShipments(): Promise<Shipment[]> {
    return this.request<Shipment[]>("/shipments");
  }

  getShipment(id: string): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${id}`);
  }

  assignBroker(shipmentId: string, input: AssignBrokerInput): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${shipmentId}/broker-assignment`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateShipmentStatus(shipmentId: string, input: UpdateShipmentStatusInput): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${shipmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  listShipmentMessages(shipmentId: string): Promise<ShipmentMessage[]> {
    return this.request<ShipmentMessage[]>(`/shipments/${shipmentId}/messages`);
  }

  sendShipmentMessage(shipmentId: string, input: SendShipmentMessageInput): Promise<ShipmentMessage> {
    return this.request<ShipmentMessage>(`/shipments/${shipmentId}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listCompanies(kind?: "shipper" | "carrier" | "broker"): Promise<
    { id: string; name: string; slug: string; kind: string; country?: string; city?: string }[]
  > {
    const suffix = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return this.request(`/directory/tenants${suffix}`);
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

  listDocumentRequests(shipmentId?: string): Promise<DocumentRequest[]> {
    const suffix = shipmentId ? `?shipmentId=${encodeURIComponent(shipmentId)}` : "";
    return this.request<DocumentRequest[]>(`/documents/requests${suffix}`);
  }

  createDocumentRequest(input: CreateDocumentRequestInput): Promise<DocumentRequest> {
    return this.request<DocumentRequest>("/documents/requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  reviewDocumentRequest(id: string, input: ReviewDocumentRequestInput): Promise<DocumentRequest> {
    return this.request<DocumentRequest>(`/documents/requests/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async downloadDocument(id: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/documents/${id}/download`, {
      credentials: "include",
      headers: {
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        ...(this.portal ? { "x-epl-portal": this.portal } : {}),
      },
    });
    if (!res.ok) throw new ApiError(res.status, "DOWNLOAD_FAILED", "Document download failed");
    return res.blob();
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

  // ── Billing ──
  listInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>("/invoices");
  }

  getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  payInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/pay`, { method: "POST" });
  }

  // ── Notifications ──
  listNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/notifications");
  }

  markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
    return this.request<{ updated: number }>("/notifications/read", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  openNotificationStream(onNotification: (notification: Notification) => void): () => void {
    const base = this.baseUrl.replace(/^http/, "ws");
    let stopped = false;
    let socket: WebSocket | null = null;
    let retryMs = 1000;
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(
        `${base}/ws/notifications?token=${encodeURIComponent(this.accessToken ?? "")}`,
      );
      socket.onopen = () => {
        retryMs = 1000;
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string);
          if (message.type === "notification") {
            onNotification(message.notification as Notification);
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
    };
    connect();
    return () => {
      stopped = true;
      socket?.close();
    };
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
  ShipmentStatus,
  Carrier,
  TrackingState,
  ShipmentDocument,
  UploadDocumentInput,
  DocumentType,
  GeniusAnswer,
  RateEstimate,
  RouteOptimizeResult,
  DocAssistResult,
  Invoice,
  Notification,
  MarketplaceQuote,
  CarrierBid,
  CarrierBidInput,
  UpdateCarrierBidInput,
  DocumentRequest,
  CreateDocumentRequestInput,
  ReviewDocumentRequestInput,
  AssignBrokerInput,
  UpdateShipmentStatusInput,
  ShipmentMessage,
  SendShipmentMessageInput,
} from "@epl/contracts";
