import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { Transaction } from './entities/transaction.entity';
import { TransactionLog } from './entities/transaction-log.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionLogRepository } from './repositories/transaction-log.repository';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { TransferProcessor } from './transfer.processor';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { TRANSFER_QUEUE } from '../../lib/bull/queue.constants';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, TransactionLog]),
    BullModule.registerQueue({
      name: TRANSFER_QUEUE,
    }),
    UserModule,
    WalletModule,
  ],
  controllers: [TransferController],
  providers: [
    TransactionRepository,
    TransactionLogRepository,
    TransferService,
    TransferProcessor,
  ],
  exports: [TransactionRepository, TransactionLogRepository, TransferService],
})
export class TransferModule {}
