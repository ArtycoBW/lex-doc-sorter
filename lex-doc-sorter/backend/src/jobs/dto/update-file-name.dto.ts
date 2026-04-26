import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFileNameDto {
  @IsString()
  @MinLength(1, { message: 'Имя файла не может быть пустым' })
  @MaxLength(180, { message: 'Имя файла слишком длинное' })
  processedName!: string;
}
