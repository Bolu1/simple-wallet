import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from 'sequelize';

@Injectable()
export class WalletRepository {
  constructor(@InjectModel(Wallet) private walletModel: typeof Wallet) {}

  async findById(id: string): Promise<Wallet | null> {
    return this.walletModel.findByPk(id);
  }

  async findByIdWithLock(id: string, transaction: Transaction): Promise<Wallet | null> {
    return this.walletModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async findAll(): Promise<Wallet[]> {
    return this.walletModel.findAll();
  }

  async findByUserId(userId: string): Promise<Wallet[]> {
    return this.walletModel.findAll({
      where: { userId },
    });
  }

  async create(data: { userId: string; balance?: number; currency?: string }): Promise<Wallet> {
    return this.walletModel.create(data);
  }

  async updateBalance(id: string, amount: number, transaction: Transaction): Promise<void> {
    await this.walletModel.update(
      { balance: amount },
      {
        where: { id },
        transaction,
      }
    );
  }

  async incrementBalance(id: string, amount: number, transaction: Transaction): Promise<void> {
    await this.walletModel.increment(
      { balance: amount },
      {
        where: { id },
        transaction,
      }
    );
  }

  async decrementBalance(id: string, amount: number, transaction: Transaction): Promise<void> {
    await this.walletModel.decrement(
      { balance: amount },
      {
        where: { id },
        transaction,
      }
    );
  }
}
