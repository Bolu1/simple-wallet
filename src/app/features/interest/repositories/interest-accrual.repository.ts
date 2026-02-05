import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InterestAccrual } from '../entities/interest-accrual.entity';
import { Transaction } from 'sequelize';
import { Op } from 'sequelize';

@Injectable()
export class InterestAccrualRepository {
  constructor(
    @InjectModel(InterestAccrual)
    private interestAccrualModel: typeof InterestAccrual,
  ) {}

  async create(
    data: {
      walletId: string;
      amount: number;
      balance: number;
      calculatedDate: Date;
      annualRate: number;
      daysInYear: number;
      metadata?: Record<string, any>;
    },
    transaction?: Transaction,
  ): Promise<InterestAccrual> {
    const uniqueKey = `${data.walletId}_${this.formatDate(data.calculatedDate)}`;

    return this.interestAccrualModel.create(
      {
        ...data,
        uniqueKey,
      },
      { transaction },
    );
  }

  async findByWalletAndDate(
    walletId: string,
    date: Date,
  ): Promise<InterestAccrual | null> {
    const uniqueKey = `${walletId}_${this.formatDate(date)}`;

    return this.interestAccrualModel.findOne({
      where: { uniqueKey },
    });
  }

  async findByWalletIdInDateRange(
    walletId: string,
    startDate: Date,
    endDate: Date,
    options?: { offset?: number; limit?: number },
  ): Promise<InterestAccrual[]> {
    return this.interestAccrualModel.findAll({
      where: {
        walletId,
        calculatedDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['calculatedDate', 'DESC']],
      offset: options?.offset,
      limit: options?.limit,
    });
  }

  async getTotalInterestByWallet(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const where: any = { walletId };

    if (startDate && endDate) {
      where.calculatedDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    const result = await this.interestAccrualModel.sum('amount', {
      where,
    });

    return result?.toString() || '0';
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
