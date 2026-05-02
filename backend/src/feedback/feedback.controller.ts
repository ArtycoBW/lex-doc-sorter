import { BadRequestException, Controller, Get, Param, Patch, Post, Query, Req, Body, UseGuards } from '@nestjs/common';
import { FeedbackCategory, FeedbackStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.sub, dto);
  }
}

@Controller('admin/feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') statusRaw?: string,
    @Query('category') categoryRaw?: string,
    @Query('source') sourceRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    return this.feedbackService.findAllForAdmin({
      search,
      status: this.parseStatus(statusRaw),
      category: this.parseCategory(categoryRaw),
      source: sourceRaw && sourceRaw !== 'ALL' ? sourceRaw : undefined,
      page: this.parsePositiveInt(pageRaw),
      pageSize: this.parsePositiveInt(pageSizeRaw),
    });
  }

  @Patch(':id')
  updateStatus(
    @Param('id') feedbackId: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(feedbackId, dto);
  }

  private parsePositiveInt(raw?: string): number | undefined {
    if (!raw) return undefined;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Некорректное значение пагинации');
    }
    return parsed;
  }

  private parseStatus(raw?: string) {
    if (!raw || raw === 'ALL') return 'ALL' as const;
    if (
      raw === FeedbackStatus.NEW ||
      raw === FeedbackStatus.REVIEWED ||
      raw === FeedbackStatus.RESOLVED
    ) {
      return raw;
    }
    throw new BadRequestException('Некорректный статус фильтра');
  }

  private parseCategory(raw?: string) {
    if (!raw || raw === 'ALL') return 'ALL' as const;
    if (
      raw === FeedbackCategory.BUG ||
      raw === FeedbackCategory.IDEA ||
      raw === FeedbackCategory.OTHER
    ) {
      return raw;
    }
    throw new BadRequestException('Некорректный тип обращения');
  }
}
