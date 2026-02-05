import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from './entities/transaction.entity';
import { TransactionLog } from './entities/transaction-log.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionLogRepository } from './repositories/transaction-log.repository';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, TransactionLog]),
    UserModule,
    WalletModule,
  ],
  providers: [TransactionRepository, TransactionLogRepository],
  exports: [TransactionRepository, TransactionLogRepository],
})
export class TransferModule {}
