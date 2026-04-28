import { IsEmail } from 'class-validator';

export class SendCodeDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email: string;
}
