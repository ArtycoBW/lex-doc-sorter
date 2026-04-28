import { IsInt, Min } from 'class-validator';

export class AdjustUserTokenBalanceDto {
  @IsInt()
  @Min(1)
  amount!: number;
}
