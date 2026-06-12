import { randomBytes, createHash, randomInt } from "node:crypto";
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { eq, and, isNull, gt } from "drizzle-orm";
import { TokenService } from "@epl/auth";
import { createDb } from "@epl/db";
import { createLogger } from "@epl/observability";
import type { LoginInput, RegisterInput } from "@epl/contracts";
import { config } from "../../config";
import { users, sessions, otpCodes } from "../../db/schema";
import { TenantClient } from "./tenant.client";

const logger = createLogger("auth-svc");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface IssuedAuth {
  accessToken: string;
  expiresIn: number;
  refreshToken: string; // delivered to client as httpOnly cookie by the controller
}

@Injectable()
export class AuthService {
  private readonly db = createDb({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    schema: config.DB_SCHEMA,
  });
  private tokens!: TokenService;

  constructor(private readonly tenant: TenantClient) {}

  private async getTokens(): Promise<TokenService> {
    if (!this.tokens) {
      this.tokens = await TokenService.create({
        privateKeyPem: config.JWT_PRIVATE_KEY,
        publicKeyPem: config.JWT_PUBLIC_KEY,
        accessTtlSeconds: config.ACCESS_TOKEN_TTL,
      });
    }
    return this.tokens;
  }

  async jwks() {
    return (await this.getTokens()).jwks();
  }

  // ── Registration: create user + provision their first tenant (admin) ──
  async register(input: RegisterInput, meta: { ip?: string; ua?: string }): Promise<IssuedAuth> {
    const existing = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()));
    if (existing.length > 0) throw new ConflictException("email already registered");

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const [user] = await this.db.db
      .insert(users)
      .values({ email: input.email.toLowerCase(), name: input.name, passwordHash })
      .returning();

    const membership = await this.tenant.provisionTenant({
      userId: user!.id,
      tenantName: input.tenantName,
      kind: input.kind,
    });

    return this.issue(user!.id, membership, meta);
  }

  // ── Password login ──
  async login(input: LoginInput, meta: { ip?: string; ua?: string }): Promise<IssuedAuth> {
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()));
    if (!user || !user.passwordHash) throw new UnauthorizedException("invalid credentials");

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("invalid credentials");

    const membership = await this.tenant.resolveMembership({
      userId: user.id,
      tenantSlug: input.tenantSlug,
    });
    if (!membership) throw new UnauthorizedException("no tenant membership");

    return this.issue(user.id, membership, meta);
  }

  // ── Email OTP: request a code ──
  async requestOtp(email: string): Promise<{ devCode?: string }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.db.db.insert(otpCodes).values({ email: email.toLowerCase(), codeHash, expiresAt });
    // Phase 1: notify-svc sends the email. For local dev we return the code.
    logger.info({ email }, "otp requested");
    return config.NODE_ENV === "production" ? {} : { devCode: code };
  }

  // ── Email OTP: verify a code, log in ──
  async verifyOtp(
    email: string,
    code: string,
    meta: { ip?: string; ua?: string },
  ): Promise<IssuedAuth> {
    const codeHash = sha256(code);
    const [row] = await this.db.db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email.toLowerCase()),
          eq(otpCodes.codeHash, codeHash),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, new Date()),
        ),
      );
    if (!row) throw new UnauthorizedException("invalid or expired code");
    await this.db.db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, row.id));

    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    if (!user) throw new UnauthorizedException("no account for this email");

    const membership = await this.tenant.resolveMembership({ userId: user.id });
    if (!membership) throw new UnauthorizedException("no tenant membership");
    return this.issue(user.id, membership, meta);
  }

  // ── Refresh: rotate token; reuse of a rotated token revokes the family ──
  async refresh(refreshToken: string, meta: { ip?: string; ua?: string }): Promise<IssuedAuth> {
    if (!refreshToken) throw new UnauthorizedException("missing refresh token");
    const hash = sha256(refreshToken);
    const [session] = await this.db.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, hash));

    if (!session) throw new UnauthorizedException("invalid refresh token");

    if (session.revokedAt) {
      // Token reuse detected → revoke the whole family (theft response).
      await this.db.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.familyId, session.familyId));
      throw new UnauthorizedException("refresh token reuse detected; session revoked");
    }
    if (session.expiresAt < new Date()) throw new UnauthorizedException("refresh token expired");

    // Revoke the old session row, mint a new one in the same family.
    await this.db.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));

    const membership = await this.tenant.resolveMembership({ userId: session.userId });
    if (!membership) throw new UnauthorizedException("no tenant membership");

    return this.issue(session.userId, membership, meta, session.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const hash = sha256(refreshToken);
    await this.db.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.refreshTokenHash, hash));
  }

  // ── Internal: mint access + refresh, persist session ──
  private async issue(
    userId: string,
    m: { tenantId: string; role: string; perms: string[] },
    meta: { ip?: string; ua?: string },
    familyId?: string,
  ): Promise<IssuedAuth> {
    const tokens = await this.getTokens();
    const sessionId = crypto.randomUUID();
    const { token: accessToken, expiresIn } = await tokens.signAccess({
      sub: userId,
      tid: m.tenantId,
      role: m.role,
      perms: m.perms,
      sid: sessionId,
    });

    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL * 1000);
    await this.db.db.insert(sessions).values({
      id: sessionId,
      userId,
      familyId: familyId ?? crypto.randomUUID(),
      refreshTokenHash: sha256(refreshToken),
      ip: meta.ip,
      userAgent: meta.ua,
      expiresAt,
    });

    return { accessToken, expiresIn, refreshToken };
  }
}
