import { FeedbackStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Комментарий администратора слишком длинный' })
  adminNote?: string;
}
