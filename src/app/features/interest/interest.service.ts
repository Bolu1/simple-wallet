import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { Transaction as SequelizeTransaction } from 'sequelize';
import Decimal from 'decimal.js';

import { InterestAccrualRepository } from './repositories/interest-accrual.repository';
import { WalletRepository } from '../wallet/repositories/wallet.repository';
import { INTEREST_CONFIG } from './interest.constants';
import {
  AccrueInterestResponseDto,
  InterestHistoryResponseDto,
} from './dto';
import { INTEREST_QUEUE, PROCESS_WALLET_INTEREST } from '../../lib/bull/queue.constants';

/**
 * Interest Service - Handles all interest calculation and accrual logic
 */
@Injectable()
export class InterestService {
  constructor(
    @InjectQueue(INTEREST_QUEUE)
    private readonly interestQueue: Queue,
    private readonly interestAccrualRepo: InterestAccrualRepository,
    private readonly walletRepo: WalletRepository,
    private readonly sequelize: Sequelize,
  ) {
    // Configure decimal.js for high-precision calculations
    (Decimal as any).set({
      precision: 20,
      rounding: Decimal.ROUND_HALF_UP,
    });
  }

  /**
   * Calculate daily interest amount
   */
  calculateDailyInterest(
    balance: string | number,
    date: Date,
    annualRate: number = INTEREST_CONFIG.ANNUAL_RATE,
  ): {
    amount: string;
    daysInYear: number;
    dailyRate: string;
  } {
    // Convert to Decimal for precise arithmetic
    const balanceDecimal = new Decimal(balance);
    const rateDecimal = new Decimal(annualRate);
    const daysInYear = this.getDaysInYear(date.getFullYear());

    // Calculate: annual rate divided by days in year gives daily rate
    const dailyRate = rateDecimal.dividedBy(daysInYear);
    // Calculate: balance times daily rate gives daily interest
    const dailyInterest = balanceDecimal.times(dailyRate);
    // Round to 2 decimal places (matching NGN currency precision)
    const roundedInterest = dailyInterest.toDecimalPlaces(2);

    return {
      amount: roundedInterest.toFixed(2),
      daysInYear,
      dailyRate: dailyRate.toString(),
    };
  }

  /**
   * Queue daily interest jobs for all active wallets
   */
  async queueDailyInterestForAllWallets(
    date: Date,
  ): Promise<{ totalWallets: number; jobsQueued: number }> {
    // Fetch all wallets that should earn interest
    const wallets = await this.walletRepo.findAll?.();

    // Handle edge case: no wallets in system
    if (!wallets || wallets.length === 0) {
      return { totalWallets: 0, jobsQueued: 0 };
    }

    let jobsQueued = 0;

    // Queue interest processing job for each wallet
    for (const wallet of wallets) {
      await this.interestQueue.add(
        PROCESS_WALLET_INTEREST,
        {
          walletId: wallet.id,
          date: date.toISOString(),
        },
        {
          attempts: INTEREST_CONFIG.MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: INTEREST_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      jobsQueued++;
    }

    return {
      totalWallets: wallets.length,
      jobsQueued,
    };
  }

  /**
   * Accrue interest for a single wallet
   */
  async accrueInterestForWallet(
    walletId: string,
    date: Date,
  ): Promise<AccrueInterestResponseDto> {
    // Idempotency check
    const existing = await this.interestAccrualRepo.findByWalletAndDate(
      walletId,
      date,
    );

    if (existing) {
      return this.mapToDto(existing);
    }

    // Start database transaction with highest isolation level
    const dbTransaction = await this.sequelize.transaction({
      isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      const wallet = await this.walletRepo.findByIdWithLock(
        walletId,
        dbTransaction,
      );

      // Check 2: Wallet existence
      if (!wallet) {
        throw new BadRequestException(`Wallet ${walletId} not found`);
      }

      // Get wallet's current balance
      const currentBalance = wallet.balance.toString();

      // Calculate daily interest using decimal.js
      const calculation = this.calculateDailyInterest(
        currentBalance,
        date,
        INTEREST_CONFIG.ANNUAL_RATE,
      );

      const interestAmount = new Decimal(calculation.amount);

      // Minimum interest threshold
      if (interestAmount.lessThan(INTEREST_CONFIG.MIN_INTEREST_AMOUNT)) {
        await dbTransaction.rollback();
        throw new BadRequestException(
          'Interest amount is too small. Balance may be zero or insufficient.',
        );
      }

      // Update wallet balance
      await this.walletRepo.incrementBalance(
        walletId,
        parseFloat(calculation.amount),
        dbTransaction,
      );

      // Record the interest accrual in audit trail
      const accrual = await this.interestAccrualRepo.create(
        {
          walletId,
          amount: parseFloat(calculation.amount),
          balance: parseFloat(currentBalance),
          calculatedDate: date,
          annualRate: INTEREST_CONFIG.ANNUAL_RATE,
          daysInYear: calculation.daysInYear,
          metadata: {
            dailyRate: calculation.dailyRate,
            calculationTimestamp: new Date().toISOString(),
            balanceBeforeInterest: currentBalance,
            balanceAfterInterest: new Decimal(currentBalance)
              .plus(calculation.amount)
              .toString(),
          },
        },
        dbTransaction,
      );

      // Commit transaction
      await dbTransaction.commit();

      return this.mapToDto(accrual);
    } catch (error) {
      // Rollback transaction on any error
      await dbTransaction.rollback();
      throw error;
    }
  }

  /**
   * Get interest history for a wallet (with pagination)
   */
  async getInterestHistory(
    walletId: string,
    startDate: Date,
    endDate: Date,
    offset: number = 0,
    limit: number = INTEREST_CONFIG.DEFAULT_LIMIT,
  ): Promise<InterestHistoryResponseDto> {
    // Fetch accrual records for the specified date range
    const accruals = await this.interestAccrualRepo.findByWalletIdInDateRange(
      walletId,
      startDate,
      endDate,
      { offset, limit },
    );

    // Calculate total interest earned in the date range
    const totalInterest = await this.interestAccrualRepo.getTotalInterestByWallet(
      walletId,
      startDate,
      endDate,
    );

    return {
      walletId,
      startDate,
      endDate,
      totalInterest: parseFloat(totalInterest),
      accruals: accruals.map((a) => this.mapToDto(a)),
      pagination: {
        offset,
        limit,
        count: accruals.length,
      },
    };
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   */
  private getDaysInYear(year: number): number {
    return this.isLeapYear(year) ? 366 : 365;
  }

  /**
   * Convert database entity to response DTOase entity
   */
  private mapToDto(accrual: any): AccrueInterestResponseDto {
    return {
      id: accrual.id,
      walletId: accrual.walletId,
      amount: parseFloat(accrual.amount),
      balance: parseFloat(accrual.balance),
      calculatedDate: accrual.calculatedDate,
      annualRate: parseFloat(accrual.annualRate),
      daysInYear: accrual.daysInYear,
      metadata: accrual.metadata,
      createdAt: accrual.createdAt,
    };
  }
}
