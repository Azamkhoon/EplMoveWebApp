import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  exportJWK,
  type JWTPayload,
  type KeyLike,
} from "jose";
import type { AccessTokenClaims } from "@epl/contracts";

const ALG = "RS256";

export interface TokenServiceOptions {
  privateKeyPem?: string; // PKCS8 — required for signing (auth-svc only)
  publicKeyPem: string; // SPKI — required everywhere for verification
  issuer?: string;
  audience?: string;
  accessTtlSeconds?: number;
}

/**
 * RS256 access-token signer/verifier. auth-svc holds the private key and signs;
 * every other service verifies with the public key. See docs/architecture/04-security.md.
 */
export class TokenService {
  private privateKey?: KeyLike;
  private publicKey!: KeyLike;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTtl: number;

  private constructor(opts: TokenServiceOptions) {
    this.issuer = opts.issuer ?? "epl-move";
    this.audience = opts.audience ?? "epl-move-clients";
    this.accessTtl = opts.accessTtlSeconds ?? 600;
  }

  static async create(opts: TokenServiceOptions): Promise<TokenService> {
    const svc = new TokenService(opts);
    svc.publicKey = await importSPKI(opts.publicKeyPem, ALG);
    if (opts.privateKeyPem) {
      svc.privateKey = await importPKCS8(opts.privateKeyPem, ALG);
    }
    return svc;
  }

  async signAccess(
    claims: Omit<AccessTokenClaims, "iat" | "exp">,
  ): Promise<{ token: string; expiresIn: number }> {
    if (!this.privateKey) throw new Error("TokenService has no private key (sign unavailable)");
    const token = await new SignJWT({
      tid: claims.tid,
      role: claims.role,
      perms: claims.perms,
      sid: claims.sid,
    } as JWTPayload)
      .setProtectedHeader({ alg: ALG })
      .setSubject(claims.sub)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtl}s`)
      .sign(this.privateKey);
    return { token, expiresIn: this.accessTtl };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.publicKey, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return {
      sub: String(payload.sub),
      tid: String(payload.tid),
      role: String(payload.role),
      perms: (payload.perms as string[]) ?? [],
      sid: String(payload.sid),
      iat: Number(payload.iat),
      exp: Number(payload.exp),
    };
  }

  /** JWKS entry for the public key (served by auth-svc at /.well-known/jwks.json). */
  async jwks() {
    const jwk = await exportJWK(this.publicKey);
    return { keys: [{ ...jwk, use: "sig", alg: ALG, kid: "epl-access-1" }] };
  }
}
