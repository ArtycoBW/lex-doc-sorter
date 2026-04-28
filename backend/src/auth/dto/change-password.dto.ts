import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Введите текущий пароль' })
  oldPassword: string;

  @IsString({ message: 'Введите новый пароль' })
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  newPassword: string;
}
