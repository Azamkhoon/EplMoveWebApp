import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  LoginInput,
  RegisterInput,
  OtpRequestInput,
  OtpVerifyInput,
} from "@epl/contracts";
import { config } from "../../config";
import { AuthService, type IssuedAuth } from "./auth.service";

const REFRESH_COOKIE = "epl_refresh";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("/.well-known/jwks.json")
  jwks() {
    return this.auth.jwks();
  }

  @Post("register")
  async register(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = RegisterInput.parse(body);
    return this.send(res, await this.auth.register(input, this.meta(req)));
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = LoginInput.parse(body);
    return this.send(res, await this.auth.login(input, this.meta(req)));
  }

  @Post("otp/request")
  @HttpCode(200)
  async otpRequest(@Body() body: unknown) {
    const input = OtpRequestInput.parse(body);
    return this.auth.requestOtp(input.email);
  }

  @Post("otp/verify")
  @HttpCode(200)
  async otpVerify(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = OtpVerifyInput.parse(body);
    return this.send(res, await this.auth.verifyOtp(input.email, input.code, this.meta(req)));
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? this.bearerRefresh(req);
    return this.send(res, await this.auth.refresh(token, this.meta(req)));
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  }

  // ── helpers ──
  private meta(req: Request) {
    return { ip: req.ip, ua: req.headers["user-agent"] };
  }

  private bearerRefresh(req: Request): string {
    const b = req.body as { refreshToken?: string } | undefined;
    if (!b?.refreshToken) throw new BadRequestException("missing refresh token");
    return b.refreshToken;
  }

  private send(res: Response, issued: IssuedAuth) {
    res.cookie(REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge: config.REFRESH_TOKEN_TTL * 1000,
    });
    return { accessToken: issued.accessToken, expiresIn: issued.expiresIn };
  }
}
