import { IsUUID, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { Currency } from '../../../../common/types/transaction.types';
import { Type } from 'class-transformer';

export class TransferRequestDto {
  @IsUUID('4', { message: 'fromWalletId must be a valid UUID' })
  fromWalletId: string;

  @IsUUID('4', { message: 'toWalletId must be a valid UUID' })
  toWalletId: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amount must be a number with max 2 decimal places' }
  )
  @Min(50, { message: 'amount must be at least 50 NGN' })
  amount: number;
}
