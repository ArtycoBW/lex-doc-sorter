import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteRegistrationDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email: string;

  @IsString({ message: 'Введите пароль' })
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  password: string;

  @IsString({ message: 'Введите ФИО' })
  @MinLength(2, { message: 'ФИО должно быть не короче 2 символов' })
  name: string;

  @IsString()
  @IsOptional()
  company?: string;
}
