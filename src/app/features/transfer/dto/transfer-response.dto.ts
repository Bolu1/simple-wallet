import { TransactionStatus, Currency } from '../../../../common/types/transaction.types';

export class TransferResponseDto {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
