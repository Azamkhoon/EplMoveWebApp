import { z } from "zod";

/* Identity & RBAC contracts (auth-svc + tenant-svc). */

export const Permission = z.string(); // e.g. "load:create" — open vocabulary, validated against seed set
export type Permission = z.infer<typeof Permission>;

export const SystemRole = z.enum([
  "shipper_admin",
  "shipper_member",
  "shipper_viewer",
  "carrier_admin",
  "carrier_member",
  "dispatcher",
  "driver",
  "broker_admin",
  "broker_agent",
  "platform_admin",
  "platform_support",
]);
export type SystemRole = z.infer<typeof SystemRole>;

/** Decoded access-token claims (see docs/architecture/04-security.md). */
export const AccessTokenClaims = z.object({
  sub: z.string().uuid(), // user id
  tid: z.string().uuid(), // active tenant id
  role: z.string(),
  perms: z.array(Permission),
  sid: z.string().uuid(), // session id
  iat: z.number(),
  exp: z.number(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaims>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().optional(), // when a user belongs to multiple tenants
});
export type LoginInput = z.infer<typeof LoginInput>;

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1), // creates the first tenant + makes user its admin
  vatNumber: z.string().regex(/^\d{9}$/, "VAT/TIN must contain 9 digits"),
  country: z.string().min(2),
  city: z.string().min(1),
  address: z.string().min(3),
  phone: z.string().min(7),
  kind: z.enum(["shipper", "carrier", "broker"]).default("shipper"), // tenant type
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  expiresIn: z.number(), // seconds
  // refresh token is delivered as an httpOnly cookie, not in the body
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const OtpRequestInput = z.object({ email: z.string().email() });
export type OtpRequestInput = z.infer<typeof OtpRequestInput>;

export const OtpVerifyInput = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInput>;
