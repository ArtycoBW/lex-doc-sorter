import { FeedbackCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sectionSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contextTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  pagePath?: string;

  @IsEnum(FeedbackCategory)
  category!: FeedbackCategory;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;

  @IsString()
  @MinLength(5, { message: 'Опишите замечание подробнее' })
  @MaxLength(4000, { message: 'Сообщение слишком длинное' })
  content!: string;
}
