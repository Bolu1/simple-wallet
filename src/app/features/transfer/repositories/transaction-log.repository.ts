import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TransactionLog } from '../entities/transaction-log.entity';
import { TransactionStatus } from '../../../../common/types/transaction.types';
import { Transaction as SequelizeTransaction } from 'sequelize';

@Injectable()
export class TransactionLogRepository {
  constructor(@InjectModel(TransactionLog) private logModel: typeof TransactionLog) {}

  async create(
    data: {
      transactionId: string;
      status: TransactionStatus;
      metadata?: Record<string, any>;
    },
    transaction?: SequelizeTransaction
  ): Promise<TransactionLog> {
    return this.logModel.create(data, { transaction });
  }

  async findByTransactionId(transactionId: string): Promise<TransactionLog[]> {
    return this.logModel.findAll({
      where: { transactionId },
      order: [['createdAt', 'ASC']],
    });
  }
}
