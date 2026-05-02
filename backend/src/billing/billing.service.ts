import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingTransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MOCK_TARIFFS, MOCK_TOKEN_PACKAGES } from './billing.defaults';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        tokenBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      userId: user.id,
      tokenBalance: user.tokenBalance,
      access: this.buildAccessSummary(user),
    };
  }

  getTariffPlans() {
    const now = new Date().toISOString();
    return MOCK_TARIFFS.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    }));
  }

  getTokenPackages() {
    const now = new Date().toISOString();
    return MOCK_TOKEN_PACKAGES.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    }));
  }

  async getHistory(userId: string, limit = 10) {
    return this.prisma.billingTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async createMockPayment(userId: string, payload: {
    targetType: 'TARIFF_PLAN' | 'TOKEN_PACKAGE';
    targetCode: string;
    quantity?: number;
  }) {
    const target =
      payload.targetType === 'TOKEN_PACKAGE'
        ? MOCK_TOKEN_PACKAGES.find((item) => item.code === payload.targetCode)
        : MOCK_TARIFFS.find((item) => item.code === payload.targetCode);

    if (!target) {
      throw new BadRequestException('Мок-пакет не найден');
    }

    const tokenAmount =
      'tokenAmount' in target ? target.tokenAmount * Math.max(payload.quantity ?? 1, 1) : 0;

    const user = tokenAmount
      ? await this.prisma.user.update({
          where: { id: userId },
          data: { tokenBalance: { increment: tokenAmount } },
          select: { tokenBalance: true },
        })
      : await this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { tokenBalance: true },
        });

    if (tokenAmount) {
      await this.prisma.billingTransaction.create({
        data: {
          userId,
          type: BillingTransactionType.PAYMENT_TOPUP,
          tokenDelta: tokenAmount,
          description: `Мок-пополнение: ${target.name}`,
          balanceAfter: user.tokenBalance,
          amount: target.price,
          currency: target.currency,
        },
      });
    }

    return {
      id: `mock_${Date.now()}`,
      externalOrderId: null,
      formUrl: null,
      status: 'SUCCEEDED',
      amount: target.price,
      currency: target.currency,
      paidAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      target: {
        type: payload.targetType,
        code: target.code,
        name: target.name,
        tokenAmount,
      },
    };
  }

  buildAccessSummary(user: {
    role: UserRole;
    tokenBalance: number;
    createdAt: Date;
  }) {
    const isUnlimited = user.role === UserRole.ADMIN || user.role === UserRole.PRO;
    const dailyLimit = user.role === UserRole.DEMO ? 50_000 : null;
    const trialEndsAt = new Date(user.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    return {
      mode: isUnlimited ? 'UNLIMITED' : 'TRIAL',
      trialActive: user.role === UserRole.DEMO,
      trialEndsAt: user.role === UserRole.DEMO ? trialEndsAt.toISOString() : null,
      dailyLimit,
      tokensUsedToday: 0,
      tokensRemainingToday: dailyLimit,
      sectionScope: 'ALL',
      extraTokenBalance: user.tokenBalance,
      currentTariff: isUnlimited
        ? {
            subscriptionId: 'mock-unlimited',
            code: user.role,
            name: user.role === UserRole.ADMIN ? 'Администратор' : 'Pro',
            dailyTokenLimit: null,
            sectionScope: 'ALL',
            startsAt: user.createdAt.toISOString(),
            endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : null,
    };
  }
}
