import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingTransactionType,
  ProcessingMode,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEMO_DAILY_TOKEN_LIMIT,
  PROCESSING_TOKEN_COST,
  TARIFF_PLANS,
  TOKEN_PACKAGES,
} from './billing.defaults';

type BillingUser = {
  id: string;
  role: UserRole;
  tokenBalance: number;
  createdAt: Date;
};

type PaymentTargetType = 'TARIFF_PLAN' | 'TOKEN_PACKAGE';

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

    const tokensUsedToday = await this.getTokensUsedToday(user.id);

    return {
      userId: user.id,
      tokenBalance: user.tokenBalance,
      access: this.buildAccessSummary(user, tokensUsedToday),
    };
  }

  getTariffPlans() {
    const now = new Date().toISOString();
    return TARIFF_PLANS.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    }));
  }

  getTokenPackages() {
    const now = new Date().toISOString();
    return TOKEN_PACKAGES.map((item) => ({
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

  estimateJobTokens(fileCount: number, mode: ProcessingMode) {
    return fileCount * PROCESSING_TOKEN_COST[mode];
  }

  async assertProcessingAllowed(
    userId: string,
    fileCount: number,
    mode: ProcessingMode,
  ) {
    const context = await this.getAccessContext(userId);
    const estimatedTokens = this.estimateJobTokens(fileCount, mode);
    const availableTokens = context.isUnlimited
      ? Number.POSITIVE_INFINITY
      : context.tokensRemainingToday + context.user.tokenBalance;

    if (estimatedTokens > availableTokens) {
      const deficit = estimatedTokens - availableTokens;
      throw new ForbiddenException(
        `Недостаточно токенов для обработки. Нужно ${this.formatNumber(
          estimatedTokens,
        )}, доступно ${this.formatNumber(availableTokens)}. Не хватает ${this.formatNumber(
          deficit,
        )}.`,
      );
    }

    return {
      estimatedTokens,
      tokensRemainingToday: context.tokensRemainingToday,
      extraTokenBalance: context.user.tokenBalance,
      isUnlimited: context.isUnlimited,
    };
  }

  async chargeProcessingUsage(
    userId: string,
    payload: {
      jobId: string;
      fileCount: number;
      mode: ProcessingMode;
    },
  ) {
    const context = await this.getAccessContext(userId);
    const estimatedTokens = this.estimateJobTokens(payload.fileCount, payload.mode);

    if (!context.isUnlimited) {
      const availableTokens =
        context.tokensRemainingToday + context.user.tokenBalance;
      if (estimatedTokens > availableTokens) {
        throw new ForbiddenException(
          `Недостаточно токенов для обработки. Нужно ${this.formatNumber(
            estimatedTokens,
          )}, доступно ${this.formatNumber(availableTokens)}.`,
        );
      }
    }

    const includedTokens = context.isUnlimited
      ? estimatedTokens
      : Math.min(estimatedTokens, context.tokensRemainingToday);
    const packageTokens = Math.max(estimatedTokens - includedTokens, 0);
    const transactionType =
      packageTokens > 0
        ? BillingTransactionType.PACKAGE_USAGE
        : context.user.role === UserRole.DEMO
          ? BillingTransactionType.TRIAL_USAGE
          : BillingTransactionType.ALLOWANCE_USAGE;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = packageTokens
        ? await tx.user.update({
            where: { id: userId },
            data: { tokenBalance: { decrement: packageTokens } },
            select: { tokenBalance: true },
          })
        : await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: { tokenBalance: true },
          });

      await tx.billingTransaction.create({
        data: {
          userId,
          type: transactionType,
          tokenDelta: packageTokens > 0 ? -packageTokens : 0,
          usageTokens: estimatedTokens,
          description: `Обработка задания ${payload.jobId.slice(0, 8)}: ${
            payload.mode === ProcessingMode.SMART ? 'умный режим' : 'быстрый режим'
          }, ${payload.fileCount} файлов`,
          balanceAfter: user.tokenBalance,
        },
      });

      return {
        estimatedTokens,
        packageTokens,
        balanceAfter: user.tokenBalance,
      };
    });

    return result;
  }

  async createPayment(userId: string, payload: {
    targetType: PaymentTargetType;
    targetCode: string;
    quantity?: number;
  }) {
    const target =
      payload.targetType === 'TOKEN_PACKAGE'
        ? TOKEN_PACKAGES.find((item) => item.code === payload.targetCode)
        : TARIFF_PLANS.find((item) => item.code === payload.targetCode);

    if (!target) {
      throw new BadRequestException('Пакет или тариф не найден');
    }

    const quantity = Math.max(payload.quantity ?? 1, 1);
    const tokenAmount =
      'tokenAmount' in target ? target.tokenAmount * quantity : 0;
    const amount = target.price * quantity;

    return {
      id: `pay_${Date.now()}_${userId.slice(0, 6)}`,
      externalOrderId: null,
      formUrl: null,
      status: 'PENDING',
      amount,
      currency: target.currency,
      paidAt: null,
      processedAt: null,
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
  }, tokensUsedToday = 0) {
    const isAdmin = user.role === UserRole.ADMIN;
    const isPro = user.role === UserRole.PRO;
    const dailyLimit = isAdmin
      ? null
      : isPro
        ? 1_500_000
        : DEMO_DAILY_TOKEN_LIMIT;
    const tokensRemainingToday =
      dailyLimit == null ? null : Math.max(dailyLimit - tokensUsedToday, 0);
    const trialEndsAt = new Date(user.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    return {
      mode: isAdmin ? 'UNLIMITED' : isPro ? 'PAID' : 'TRIAL',
      trialActive: user.role === UserRole.DEMO,
      trialEndsAt: user.role === UserRole.DEMO ? trialEndsAt.toISOString() : null,
      dailyLimit,
      tokensUsedToday,
      tokensRemainingToday,
      sectionScope: 'ALL',
      extraTokenBalance: user.tokenBalance,
      currentTariff: user.role !== UserRole.DEMO
        ? {
            subscriptionId: `${user.role.toLowerCase()}-access`,
            code: user.role === UserRole.ADMIN ? 'ADMIN' : 'pro_monthly',
            name: user.role === UserRole.ADMIN ? 'Администратор' : 'Профессиональный',
            dailyTokenLimit: dailyLimit,
            sectionScope: 'ALL',
            startsAt: user.createdAt.toISOString(),
            endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          }
          : null,
    };
  }

  private async getAccessContext(userId: string) {
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

    const tokensUsedToday = await this.getTokensUsedToday(user.id);
    const access = this.buildAccessSummary(user, tokensUsedToday);

    return {
      user: user as BillingUser,
      access,
      isUnlimited: user.role === UserRole.ADMIN,
      tokensRemainingToday: access.tokensRemainingToday ?? Number.POSITIVE_INFINITY,
    };
  }

  private async getTokensUsedToday(userId: string) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const aggregate = await this.prisma.billingTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: since },
        usageTokens: { gt: 0 },
      },
      _sum: { usageTokens: true },
    });

    return aggregate._sum.usageTokens ?? 0;
  }

  private formatNumber(value: number) {
    if (!Number.isFinite(value)) {
      return 'без ограничений';
    }

    return new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(value)));
  }
}
