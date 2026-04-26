import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendCodeDto, VerifyCodeDto, CompleteRegistrationDto, LoginDto, LoginVerifyDto, ChangePasswordDto, ResetPasswordDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode(dto);
  }

  @Post('send-registration-code')
  sendRegistrationCode(@Body() dto: SendCodeDto) {
    return this.auth.sendRegistrationCode(dto);
  }

  @Post('send-reset-code')
  sendResetPasswordCode(@Body() dto: SendCodeDto) {
    return this.auth.sendResetPasswordCode(dto);
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode(dto);
  }

  @Post('register')
  completeRegistration(@Req() req: any, @Body() dto: CompleteRegistrationDto) {
    return this.auth.completeRegistration(dto, this.getClientSessionMeta(req));
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('login-verify')
  loginVerify(@Req() req: any, @Body() dto: LoginVerifyDto) {
    return this.auth.loginVerify(dto, this.getClientSessionMeta(req));
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.sub, dto);
  }

  @Post('refresh')
  refresh(@Req() req: any, @Body('refreshToken') refreshToken: string) {
    return this.auth.refreshToken(refreshToken, this.getClientSessionMeta(req));
  }

  private getClientSessionMeta(req: any) {
    const userAgentHeader = req?.headers?.['user-agent'];
    const forwardedForHeader = req?.headers?.['x-forwarded-for'];

    const device =
      typeof userAgentHeader === 'string' && userAgentHeader.trim().length > 0
        ? userAgentHeader.trim().slice(0, 500)
        : null;

    const forwardedIp = Array.isArray(forwardedForHeader)
      ? forwardedForHeader[0]
      : forwardedForHeader;

    const ipCandidate =
      typeof forwardedIp === 'string' && forwardedIp.trim().length > 0
        ? forwardedIp.split(',')[0]?.trim()
        : req?.ip ?? req?.socket?.remoteAddress ?? null;

    const ip =
      typeof ipCandidate === 'string' && ipCandidate.length > 0
        ? ipCandidate.slice(0, 100)
        : null;

    return { device, ip };
  }
}
