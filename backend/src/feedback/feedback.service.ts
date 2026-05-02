import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeedbackCategory, FeedbackStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

type AdminFeedbackFilters = {
  search?: string;
  status?: FeedbackStatus | 'ALL';
  category?: FeedbackCategory | 'ALL';
  source?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const sectionSlug = dto.sectionSlug?.trim() || dto.pagePath?.trim() || 'app';
    const conversationTitle = dto.contextTitle?.trim() || 'Общая обратная связь';
    const pagePath = dto.pagePath?.trim() || sectionSlug;

    return this.prisma.feedbackSubmission.create({
      data: {
        userId,
        sectionSlug,
        conversationId: dto.conversationId?.trim() || `page:${pagePath}`,
        conversationTitle,
        messageId: dto.messageId?.trim() || null,
        messagePreview: null,
        category: dto.category,
        content: dto.content.trim(),
        source: dto.source?.trim() || 'form',
      },
      select: {
        id: true,
        category: true,
        status: true,
        content: true,
        createdAt: true,
      },
    });
  }

  async findAllForAdmin(filters: AdminFeedbackFilters) {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: Prisma.FeedbackSubmissionWhereInput = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.category && filters.category !== 'ALL') {
      where.category = filters.category;
    }
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { conversationTitle: { contains: search, mode: 'insensitive' } },
        { sectionSlug: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, statusSummary, categorySummary] = await Promise.all([
      this.prisma.feedbackSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.feedbackSubmission.count({ where }),
      this.prisma.feedbackSubmission.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.feedbackSubmission.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusSummary: Object.fromEntries(
        statusSummary.map((item) => [item.status, item._count._all]),
      ),
      categorySummary: Object.fromEntries(
        categorySummary.map((item) => [item.category, item._count._all]),
      ),
    };
  }

  async updateStatus(feedbackId: string, dto: UpdateFeedbackStatusDto) {
    try {
      return await this.prisma.feedbackSubmission.update({
        where: { id: feedbackId },
        data: {
          status: dto.status,
          adminNote: dto.adminNote?.trim() || null,
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Обращение не найдено');
      }
      throw error;
    }
  }

  ensureContent(value: string) {
    if (!value.trim()) {
      throw new BadRequestException('Сообщение не может быть пустым');
    }
  }
}
