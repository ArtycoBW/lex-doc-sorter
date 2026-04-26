import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Код должен быть из 6 цифр' })
  code: string;
}
