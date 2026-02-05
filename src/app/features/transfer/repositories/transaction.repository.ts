import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus, Currency } from '../../../../common/types/transaction.types';
import { Transaction as SequelizeTransaction } from 'sequelize';

@Injectable()
export class TransactionRepository {
  constructor(@InjectModel(Transaction) private transactionModel: typeof Transaction) {}

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({
      where: { idempotencyKey: key },
    });
  }

  async create(
    data: {
      fromWalletId?: string;
      toWalletId: string;
      amount: number;
      currency: Currency;
      status: TransactionStatus;
      idempotencyKey: string;
      metadata?: Record<string, any>;
    },
    transaction?: SequelizeTransaction
  ): Promise<Transaction> {
    return this.transactionModel.create(data, { transaction });
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    transaction?: SequelizeTransaction
  ): Promise<void> {
    await this.transactionModel.update(
      { status },
      {
        where: { id },
        transaction,
      }
    );
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactionModel.findByPk(id);
  }

  async findByWalletId(
    walletId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<Transaction[]> {
    return this.transactionModel.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { fromWalletId: walletId },
          { toWalletId: walletId },
        ],
      },
      offset: options?.offset,
      limit: options?.limit,
      order: [['createdAt', 'DESC']],
    });
  }
}
