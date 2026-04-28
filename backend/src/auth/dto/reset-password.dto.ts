import { IsEmail, IsString, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Код должен быть из 6 цифр' })
  code: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  newPassword: string;
}
