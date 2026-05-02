import { ProcessingMode } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class StartProcessingDto {
  @IsOptional()
  @IsEnum(ProcessingMode)
  mode?: ProcessingMode;
}
