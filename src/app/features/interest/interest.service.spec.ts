/**
 * InterestService Unit Tests - 28 tests covering all functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import Decimal from 'decimal.js';
import { BadRequestException } from '@nestjs/common';

import { InterestService } from './interest.service';
import { InterestAccrualRepository } from './repositories/interest-accrual.repository';
import { WalletRepository } from '../wallet/repositories/wallet.repository';
import { INTEREST_CONFIG } from './interest.constants';

describe('InterestService', () => {
  let service: InterestService;
  let interestAccrualRepo: jest.Mocked<InterestAccrualRepository>;
  let walletRepo: jest.Mocked<WalletRepository>;
  let sequelize: jest.Mocked<Sequelize>;

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  beforeEach(async () => {
    const mockInterestAccrualRepo = {
      create: jest.fn(),
      findByWalletAndDate: jest.fn(),
      findByWalletIdInDateRange: jest.fn(),
      getTotalInterestByWallet: jest.fn(),
    };

    const mockWalletRepo = {
      findById: jest.fn(),
      findByIdWithLock: jest.fn(),
      incrementBalance: jest.fn(),
      findAll: jest.fn(),
    };

    const mockSequelize = {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    const mockInterestQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestService,
        {
          provide: InterestAccrualRepository,
          useValue: mockInterestAccrualRepo,
        },
        {
          provide: WalletRepository,
          useValue: mockWalletRepo,
        },
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
        {
          provide: 'BullQueue_interest-queue',
          useValue: mockInterestQueue,
        },
      ],
    })
      .overrideProvider('interest-queue_queue')
      .useValue(mockInterestQueue)
      .compile();

    service = module.get<InterestService>(InterestService);
    interestAccrualRepo = module.get(InterestAccrualRepository) as jest.Mocked<
      InterestAccrualRepository
    >;
    walletRepo = module.get(WalletRepository) as jest.Mocked<WalletRepository>;
    sequelize = module.get(Sequelize) as jest.Mocked<Sequelize>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyInterest', () => {
    it('should calculate correct interest for non-leap year', () => {
      const balance = '10000.00';
      const date = new Date('2025-06-15');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('7.53');
      expect(result.daysInYear).toBe(365);
    });

    it('should calculate correct interest for leap year', () => {
      const balance = '10000.00';
      const date = new Date('2024-06-15');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('7.51');
      expect(result.daysInYear).toBe(366);
    });

    it('should handle zero balance', () => {
      const balance = '0.00';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('0.00');
    });

    it('should handle string balance input', () => {
      const balance = '5000.50';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('3.77');
    });

    it('should handle numeric balance input', () => {
      const balance = 5000.5;
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('3.77');
    });

    it('should maintain precision with large balances', () => {
      const balance = '999999999.99';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      const expected = new Decimal(balance)
        .times(0.275)
        .dividedBy(365)
        .toDecimalPlaces(2);

      expect(result.amount).toBe(expected.toString());
    });

    it('should round half-up correctly', () => {
      const balance = '1000.00';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      const expected = new Decimal('1000')
        .times('0.275')
        .dividedBy(365)
        .toDecimalPlaces(2);

      expect(result.amount).toBe(expected.toString());
    });

    it('should handle small balances with minimal interest', () => {
      const balance = '1.00';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('0.00');
    });

    it('should use custom annual rate when provided', () => {
      const balance = '10000.00';
      const date = new Date('2025-01-01');
      const customRate = 0.5;
      const result = service.calculateDailyInterest(balance, date, customRate);

      expect(result.amount).toBe('13.70');
    });

    it('should not have floating-point errors', () => {
      const balance = '123.45';
      const date = new Date('2025-06-15');
      const result = service.calculateDailyInterest(balance, date);

      // Calculate expected value using decimal.js (ground truth)
      const decimal = new Decimal(balance)
        .times(0.275)
        .dividedBy(365)
        .toDecimalPlaces(2);

      expect(result.amount).toBe(decimal.toString());
    });
  });


  describe('accrueInterestForWallet', () => {
    const walletId = '123e4567-e89b-12d3-a456-426614174000';
    const date = new Date('2025-06-15');

    it('should return existing accrual if already processed', async () => {
      const existingAccrual = {
        id: 'accrual-id',
        walletId,
        amount: 7.53,
        balance: 10000.0,
        calculatedDate: date,
        annualRate: 0.275,
        daysInYear: 365,
        metadata: {},
        createdAt: new Date(),
      };

      interestAccrualRepo.findByWalletAndDate.mockResolvedValue(existingAccrual as any);

      const result = await service.accrueInterestForWallet(walletId, date);

      expect(result.id).toBe('accrual-id');
      expect(result.amount).toBe(7.53);
      expect(sequelize.transaction).not.toHaveBeenCalled();  // No DB transaction needed
    });

    it('should accrue interest and update wallet balance', async () => {
      interestAccrualRepo.findByWalletAndDate.mockResolvedValue(null);

      const mockWallet = {
        id: walletId,
        balance: '10000.00',
      };

      walletRepo.findByIdWithLock.mockResolvedValue(mockWallet as any);

      const mockAccrual = {
        id: 'new-accrual-id',
        walletId,
        amount: 7.53,
        balance: 10000.0,
        calculatedDate: date,
        annualRate: 0.275,
        daysInYear: 365,
        metadata: {
          dailyRate: '0.00075342465753424657',
          balanceBeforeInterest: '10000.00',
          balanceAfterInterest: '10007.53',
        },
        createdAt: new Date(),
      };

      interestAccrualRepo.create.mockResolvedValue(mockAccrual as any);

      const result = await service.accrueInterestForWallet(walletId, date);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(walletRepo.findByIdWithLock).toHaveBeenCalledWith(
        walletId,
        mockTransaction,
      );
      expect(walletRepo.incrementBalance).toHaveBeenCalledWith(
        walletId,
        7.53,
        mockTransaction,
      );
      expect(interestAccrualRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          amount: 7.53,
          balance: 10000.0,
          calculatedDate: date,
          annualRate: 0.275,
          daysInYear: 365,
        }),
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.amount).toBe(7.53);
    });

    it('should throw error if wallet not found', async () => {
      interestAccrualRepo.findByWalletAndDate.mockResolvedValue(null);
      walletRepo.findByIdWithLock.mockResolvedValue(null);  // Wallet doesn't exist

      await expect(
        service.accrueInterestForWallet(walletId, date),
      ).rejects.toThrow(BadRequestException);

      expect(mockTransaction.rollback).toHaveBeenCalled();  // Rollback on error
    });

    it('should throw error if interest amount is too small', async () => {
      interestAccrualRepo.findByWalletAndDate.mockResolvedValue(null);

      const mockWallet = {
        id: walletId,
        balance: '0.00',  // Zero balance = zero interest
      };

      walletRepo.findByIdWithLock.mockResolvedValue(mockWallet as any);

      await expect(
        service.accrueInterestForWallet(walletId, date),
      ).rejects.toThrow('Interest amount is too small');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback on error during balance increment', async () => {
      interestAccrualRepo.findByWalletAndDate.mockResolvedValue(null);

      const mockWallet = {
        id: walletId,
        balance: '10000.00',
      };

      walletRepo.findByIdWithLock.mockResolvedValue(mockWallet as any);

      // Simulate database error during balance update
      walletRepo.incrementBalance.mockRejectedValue(new Error('DB error'));

      await expect(
        service.accrueInterestForWallet(walletId, date),
      ).rejects.toThrow('DB error');

      // Verify rollback was called to undo any changes
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getInterestHistory', () => {
    const walletId = '123e4567-e89b-12d3-a456-426614174000';
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    it('should return interest history with pagination', async () => {
      const mockAccruals = [
        {
          id: 'accrual-1',
          walletId,
          amount: 7.53,
          balance: 10000.0,
          calculatedDate: new Date('2025-01-31'),
          annualRate: 0.275,
          daysInYear: 365,
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'accrual-2',
          walletId,
          amount: 7.53,
          balance: 10007.53,
          calculatedDate: new Date('2025-01-30'),
          annualRate: 0.275,
          daysInYear: 365,
          metadata: {},
          createdAt: new Date(),
        },
      ];

      interestAccrualRepo.findByWalletIdInDateRange.mockResolvedValue(
        mockAccruals as any,
      );
      interestAccrualRepo.getTotalInterestByWallet.mockResolvedValue('233.43');

      const result = await service.getInterestHistory(
        walletId,
        startDate,
        endDate,
        0,
        50,
      );

      expect(result.walletId).toBe(walletId);
      expect(result.totalInterest).toBe(233.43);
      expect(result.accruals).toHaveLength(2);
      expect(result.pagination).toEqual({
        offset: 0,
        limit: 50,
        count: 2,
      });
    });

    it('should handle empty history', async () => {
      interestAccrualRepo.findByWalletIdInDateRange.mockResolvedValue([]);
      interestAccrualRepo.getTotalInterestByWallet.mockResolvedValue('0');

      const result = await service.getInterestHistory(
        walletId,
        startDate,
        endDate,
      );

      expect(result.totalInterest).toBe(0);
      expect(result.accruals).toHaveLength(0);
    });
  });

  describe('leap year detection', () => {
    it('should correctly identify leap years', () => {
      expect(
        service.calculateDailyInterest('1000', new Date('2024-01-01'), 0.275)
          .daysInYear,
      ).toBe(366);
      expect(
        service.calculateDailyInterest('1000', new Date('2000-01-01'), 0.275)
          .daysInYear,
      ).toBe(366);
    });

    it('should correctly identify non-leap years', () => {
      expect(
        service.calculateDailyInterest('1000', new Date('2025-01-01'), 0.275)
          .daysInYear,
      ).toBe(365);
      expect(
        service.calculateDailyInterest('1000', new Date('2100-01-01'), 0.275)
          .daysInYear,
      ).toBe(365);
    });
  });

  describe('edge cases', () => {
    it('should handle date at year boundary', () => {
      const balance = '10000.00';
      const date = new Date('2024-12-31');

      const result = service.calculateDailyInterest(balance, date);

      expect(result.daysInYear).toBe(366);
    });

    it('should handle date at leap day', () => {
      const balance = '10000.00';
      const date = new Date('2024-02-29');

      const result = service.calculateDailyInterest(balance, date);

      expect(result.daysInYear).toBe(366);
      expect(result.amount).toBe('7.51');
    });

    it('should handle very small balance', () => {
      const balance = '0.01';
      const date = new Date('2025-01-01');

      const result = service.calculateDailyInterest(balance, date);

      expect(result.amount).toBe('0.00');
    });

    it('should handle year 1900 (not leap year)', () => {
      const balance = '10000.00';
      const date = new Date('1900-02-28');

      const result = service.calculateDailyInterest(balance, date);

      expect(result.daysInYear).toBe(365);
    });

    it('should handle year 2400 (leap year)', () => {
      const balance = '10000.00';
      const date = new Date('2400-02-29');

      const result = service.calculateDailyInterest(balance, date);

      expect(result.daysInYear).toBe(366);
    });
  });

  describe('decimal precision', () => {
    it('should not have floating-point rounding errors', () => {
      const balance = '0.15';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      // Calculate using decimal.js as ground truth
      const decimal = new Decimal('0.15')
        .times('0.275')
        .dividedBy(365)
        .toDecimalPlaces(2);

      expect(result.amount).toBe(decimal.toFixed(2));
    });

    it('should handle repeating decimals correctly', () => {
      const balance = '333.33';
      const date = new Date('2025-01-01');
      const result = service.calculateDailyInterest(balance, date);

      // Calculate using decimal.js as ground truth
      const decimal = new Decimal('333.33')
        .times('0.275')
        .dividedBy(365)
        .toDecimalPlaces(2);

      expect(result.amount).toBe(decimal.toFixed(2));
    });
  });
});
