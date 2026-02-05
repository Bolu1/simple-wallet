import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';

import { InterestAccrual } from './entities/interest-accrual.entity';
import { InterestAccrualRepository } from './repositories/interest-accrual.repository';
import { InterestService } from './interest.service';
import { InterestProcessor } from './interest.processor';
import { WalletModule } from '../wallet/wallet.module';
import { INTEREST_QUEUE } from '../../lib/bull/queue.constants';

@Module({
  imports: [
    SequelizeModule.forFeature([InterestAccrual]),
    BullModule.registerQueue({
      name: INTEREST_QUEUE,
    }),
    WalletModule,
  ],
  providers: [InterestAccrualRepository, InterestService, InterestProcessor],
  exports: [InterestAccrualRepository, InterestService],
})
export class InterestModule {}
