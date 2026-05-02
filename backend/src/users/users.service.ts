import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  company: true,
  role: true,
  isVerified: true,
  isBanned: true,
  tokenBalance: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const query = search?.trim();

    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { company: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: userSelect,
    });

    return users.map((user) => this.serializeUser(user));
  }

  async getAdminOverview() {
    const [
      totalUsers,
      verifiedUsers,
      bannedUsers,
      proUsers,
      adminUsers,
      totalJobs,
      totalFiles,
      completedFiles,
      recentJobs,
      jobStatusCounts,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({ where: { role: UserRole.PRO } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.sortingJob.count(),
      this.prisma.processedFile.count(),
      this.prisma.processedFile.count({ where: { status: 'COMPLETED' } }),
      this.prisma.sortingJob.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
        },
      }),
      this.prisma.sortingJob.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { id: true },
      }),
    ]);

    return {
      totals: {
        users: totalUsers,
        verifiedUsers,
        bannedUsers,
        demoUsers: Math.max(totalUsers - proUsers - adminUsers, 0),
        proUsers,
        adminUsers,
        jobs: totalJobs,
        files: totalFiles,
        completedFiles,
      },
      jobStatuses: jobStatusCounts.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.status] =
            (item._count as { id?: number } | undefined)?.id ?? 0;
          return acc;
        },
        {},
      ),
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        user: job.user,
      })),
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.serializeUser(user);
  }

  async updateRole(userId: string, role: UserRole) {
    await this.ensureUserExists(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userSelect,
    });

    return this.serializeUser(updatedUser);
  }

  async adjustTokenBalance(userId: string, amount: number) {
    await this.ensureUserExists(userId);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Укажите корректное количество токенов');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: amount } },
      select: userSelect,
    });

    return this.serializeUser(updatedUser);
  }

  async banUser(userId: string) {
    await this.ensureUserExists(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
      select: userSelect,
    });

    return this.serializeUser(updatedUser);
  }

  async unbanUser(userId: string) {
    await this.ensureUserExists(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
      select: userSelect,
    });

    return this.serializeUser(updatedUser);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureUserExists(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() || null,
        company: dto.company?.trim() || null,
      },
      select: userSelect,
    });

    return this.serializeUser(updatedUser);
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
  }

  private serializeUser(user: SelectedUser) {
    return {
      ...user,
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
