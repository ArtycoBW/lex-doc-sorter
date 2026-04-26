import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SendCodeDto, VerifyCodeDto, CompleteRegistrationDto, LoginDto, LoginVerifyDto, ChangePasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  private readonly accessTokenTtl = '15m';
  private readonly refreshTokenTtl = '7d';

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  private async createAndSendCode(email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.verificationCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    await this.prisma.verificationCode.create({
      data: { email, code, expiresAt },
    });

    const otpDevMode = this.config.get<string>('OTP_DEV_MODE') === 'true';
    if (otpDevMode) {
      console.log(`[OTP DEV MODE] ${email}: ${code}`);
      return { message: 'Код создан в dev-режиме', devCode: code };
    }

    try {
      await this.email.sendVerificationCode(email, code);
    } catch (error) {
      const isProduction = this.config.get<string>('NODE_ENV') === 'production';
      if (isProduction) {
        throw error;
      }
      console.warn(`[OTP FALLBACK] Email provider failed for ${email}. Returning dev code.`);
      return { message: 'Код создан, email не отправлен', devCode: code };
    }

    return { message: 'Код отправлен на email' };
  }

  async sendCode(dto: SendCodeDto) {
    return this.createAndSendCode(dto.email);
  }

  async sendRegistrationCode(dto: SendCodeDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Пользователь уже зарегистрирован');
    }

    return this.createAndSendCode(dto.email);
  }

  async sendResetPasswordCode(dto: SendCodeDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!existing) {
      throw new BadRequestException('Пользователь с таким email не найден');
    }

    return this.createAndSendCode(dto.email);
  }

  async verifyCode(dto: VerifyCodeDto) {
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Неверный или просроченный код');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      return { verified: true, isNewUser: false };
    }

    return { verified: true, isNewUser: true };
  }

  async completeRegistration(
    dto: CompleteRegistrationDto,
    sessionMeta?: { device?: string | null; ip?: string | null },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Пользователь уже существует');
    }

    const verified = await this.prisma.verificationCode.findFirst({
      where: { email: dto.email, used: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!verified) {
      throw new BadRequestException('Email не подтверждён');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        company: dto.company,
        isVerified: true,
      },
    });

    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      sessionMeta,
    );

    return { user: await this.serializeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Ваш аккаунт заблокирован. Обратитесь к администратору');
    }

    await this.sendCode({ email: dto.email });

    return { message: 'Код подтверждения отправлен', requiresVerification: true };
  }

  async loginVerify(
    dto: LoginVerifyDto,
    sessionMeta?: { device?: string | null; ip?: string | null },
  ) {
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Неверный или просроченный код');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      sessionMeta,
    );

    return { user: await this.serializeUser(user), ...tokens };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('Пользователь не найден');
    }

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!valid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Пароль успешно изменён' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Неверный или просроченный код');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Пароль успешно изменён' };
  }

  async refreshToken(
    currentRefreshToken: string,
    sessionMeta?: { device?: string | null; ip?: string | null },
  ) {
    if (!currentRefreshToken) {
      throw new UnauthorizedException('Refresh token отсутствует');
    }

    let payload: { sub: string; email: string; role: string; sid?: string };
    try {
      payload = await this.jwt.verifyAsync(currentRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!payload.sid) {
      throw new UnauthorizedException(
        'Сессия устарела. Войдите в аккаунт снова.',
      );
    }

    let validSession = await this.prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (validSession) {
      const isCurrentSessionValid = await bcrypt.compare(
        currentRefreshToken,
        validSession.token,
      );

      if (!isCurrentSessionValid) {
        validSession = null;
      }
    }

    if (!validSession) {
      throw new UnauthorizedException(
        'Сессия завершена, потому что вход выполнен на другом устройстве.',
      );
    }

    await this.prisma.session.delete({ where: { id: validSession.id } });

    return this.generateTokens(user.id, user.email, user.role, {
      device: sessionMeta?.device ?? validSession.device,
      ip: sessionMeta?.ip ?? validSession.ip,
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    sessionMeta?: { device?: string | null; ip?: string | null },
  ) {
    const sessionId = randomUUID();
    const payload = { sub: userId, email, role, sid: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: this.accessTokenTtl }),
      this.jwt.signAsync(payload, { expiresIn: this.refreshTokenTtl }),
    ]);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        token: tokenHash,
        device: sessionMeta?.device ?? null,
        ip: sessionMeta?.ip ?? null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async serializeUser(user: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    role: UserRole;
    isVerified: boolean;
    tokenBalance: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      isVerified: user.isVerified,
      tokenBalance: user.tokenBalance,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      access: {
        mode: user.role === UserRole.ADMIN || user.role === UserRole.PRO ? 'UNLIMITED' : 'TRIAL',
        trialActive: user.role === UserRole.DEMO,
        trialEndsAt: null,
        dailyLimit: null,
        tokensUsedToday: 0,
        tokensRemainingToday: null,
        sectionScope: 'ALL',
        extraTokenBalance: user.tokenBalance,
        currentTariff: null,
      },
    };
  }
}
