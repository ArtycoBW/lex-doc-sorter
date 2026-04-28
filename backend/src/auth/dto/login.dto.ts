import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email: string;

  @IsString({ message: 'Введите пароль' })
  password: string;
}
