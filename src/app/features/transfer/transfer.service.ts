import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { Transaction as SequelizeTransaction } from 'sequelize';

import { RedisService } from '../../../app/lib/redis/redis.service';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionLogRepository } from './repositories/transaction-log.repository';
import { WalletRepository } from '../wallet/repositories/wallet.repository';
import { TransferRequestDto, TransferResponseDto } from './dto';
import {
  TransactionStatus,
  Currency,
} from '../../../common/types/transaction.types';
import {
  TRANSFER_QUEUE,
  PROCESS_TRANSFER,
} from '../../lib/bull/queue.constants';
import { TRANSFER_CONFIG } from './transfer.constants';
import { CACHE_KEYS } from './cache.constants';

@Injectable()
export class TransferService {
  constructor(
    @InjectQueue(TRANSFER_QUEUE) private readonly transferQueue: Queue,
    private readonly transactionRepo: TransactionRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly walletRepo: WalletRepository,
    private readonly redisService: RedisService,
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Initiate transfer (synchronous API layer)
   */
  async initiateTransfer(
    dto: TransferRequestDto,
    idempotencyKey: string,
  ): Promise<TransferResponseDto> {
    // 1. Check Redis cache (fast path)
    const cacheKey = CACHE_KEYS.TRANSFER(idempotencyKey);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // 2. Check database for duplicate idempotency key
    const existing =
      await this.transactionRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      await this.cacheTransaction(existing, idempotencyKey);
      return this.mapToDto(existing);
    }

    // 3. Validate wallets exist
    const [fromWallet, toWallet] = await Promise.all([
      this.walletRepo.findById(dto.fromWalletId),
      this.walletRepo.findById(dto.toWalletId),
    ]);

    if (!fromWallet) {
      throw new NotFoundException(
        `Source wallet ${dto.fromWalletId} not found`,
      );
    }

    if (!toWallet) {
      throw new NotFoundException(
        `Destination wallet ${dto.toWalletId} not found`,
      );
    }

    // 4. Check balance
    const balance = parseFloat(fromWallet.balance.toString());
    if (balance < dto.amount) {
      throw new BadRequestException(`Insufficient funds`);
    }

    // 5. Create transaction with PENDING status
    const transaction = await this.transactionRepo.create({
      fromWalletId: dto.fromWalletId,
      toWalletId: dto.toWalletId,
      amount: dto.amount,
      currency: Currency.NGN,
      status: TransactionStatus.PENDING,
      idempotencyKey,
    });

    // 6. Create TransactionLog with PENDING (audit trail)
    await this.transactionLogRepo.create({
      transactionId: transaction.id,
      status: TransactionStatus.PENDING,
      metadata: {
        step: 'initiated',
        initiatedAt: new Date().toISOString(),
        fromWalletBalance: balance,
        toWalletBalance: parseFloat(toWallet.balance.toString()),
      },
    });

    // 7. Enqueue job for async processing
    try {
      await this.transferQueue.add(
        PROCESS_TRANSFER,
        { transactionId: transaction.id },
        {
          attempts: TRANSFER_CONFIG.MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: TRANSFER_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: false, // Keep for debugging
          removeOnFail: false, // Keep for DLQ analysis
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to enqueue transfer: ${error.message}`,
      );
    }

    // 8. Cache result in Redis (24 hours)
    await this.cacheTransaction(transaction, idempotencyKey);

    // 9. Return DTO
    return this.mapToDto(transaction);
  }

  /**
   * Process transfer (asynchronous Bull processor)
   */
  async processTransfer(transactionId: string): Promise<void> {
    // Fetch transaction
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    // Start Sequelize transaction with SERIALIZABLE isolation
    const dbTransaction = await this.sequelize.transaction({
      isolationLevel: SequelizeTransaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // Acquire wallet locks (prevents race conditions)
      const fromWallet = await this.walletRepo.findByIdWithLock(
        transaction.fromWalletId,
        dbTransaction,
      );
      const toWallet = await this.walletRepo.findByIdWithLock(
        transaction.toWalletId,
        dbTransaction,
      );

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('Wallet not found during processing');
      }

      // Check balance
      const fromBalance = parseFloat(fromWallet.balance.toString());
      if (fromBalance < transaction.amount) {
        // Mark as FAILED
        await this.transactionRepo.updateStatus(
          transactionId,
          TransactionStatus.FAILED,
          dbTransaction,
        );

        await this.transactionLogRepo.create(
          {
            transactionId,
            status: TransactionStatus.FAILED,
            metadata: {
              error: 'Insufficient funds during processing',
              reason: 'Balance may have changed between request and processing',
              attemptedAmount: transaction.amount,
              availableBalance: fromBalance,
              failedAt: new Date().toISOString(),
            },
          },
          dbTransaction,
        );

        await dbTransaction.commit();

        // Update cache with failed status
        const updated = await this.transactionRepo.findById(transactionId);
        await this.cacheTransaction(updated, transaction.idempotencyKey);

        throw new BadRequestException(
          `Insufficient funds: ${fromBalance} available, ${transaction.amount} required`,
        );
      }

      // Transfer funds
      await this.walletRepo.decrementBalance(
        fromWallet.id,
        transaction.amount,
        dbTransaction,
      );
      await this.walletRepo.incrementBalance(
        toWallet.id,
        transaction.amount,
        dbTransaction,
      );

      // Update transaction to COMPLETED
      await this.transactionRepo.updateStatus(
        transactionId,
        TransactionStatus.COMPLETED,
        dbTransaction,
      );

      // Create TransactionLog with COMPLETED
      await this.transactionLogRepo.create(
        {
          transactionId,
          status: TransactionStatus.COMPLETED,
          metadata: {
            step: 'completed',
            completedAt: new Date().toISOString(),
            fromWalletFinalBalance: fromBalance - transaction.amount,
            toWalletFinalBalance:
              parseFloat(toWallet.balance.toString()) + transaction.amount,
          },
        },
        dbTransaction,
      );

      // Commit transaction (release locks)
      await dbTransaction.commit();

      // Update cache with completed transaction
      const completed = await this.transactionRepo.findById(transactionId);
      await this.cacheTransaction(completed, transaction.idempotencyKey);
    } catch (error) {
      // Rollback on any error
      try {
        await dbTransaction.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      // Log error in TransactionLog
      try {
        await this.transactionLogRepo.create({
          transactionId,
          status: TransactionStatus.FAILED,
          metadata: {
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5),
            failedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      // Re-throw to trigger Bull retry
      throw error;
    }
  }

  /**
   * Helper: Cache transaction in Redis
   */
  private async cacheTransaction(
    transaction: any,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.TRANSFER(idempotencyKey);
      await this.redisService.set(
        cacheKey,
        JSON.stringify(this.mapToDto(transaction)),
        TRANSFER_CONFIG.CACHE_TTL, // 24 hours
      );
    } catch (error) {
      console.error('Failed to cache transaction:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Helper: Map entity to DTO
   */
  private mapToDto(transaction: any): TransferResponseDto {
    return {
      id: transaction.id,
      fromWalletId: transaction.fromWalletId,
      toWalletId: transaction.toWalletId,
      amount: parseFloat(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      idempotencyKey: transaction.idempotencyKey,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
