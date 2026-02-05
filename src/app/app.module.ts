import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AppConfigModule } from '../common/config/app-config.module';
import { BullQueueModule } from './lib/bull/bull.module';
import { RedisModule } from './lib/redis/redis.module';
import { UserModule } from './features/user/user.module';
import { WalletModule } from './features/wallet/wallet.module';
import { TransferModule } from './features/transfer/transfer.module';
import { InterestModule } from './features/interest/interest.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    BullQueueModule,
    UserModule,
    WalletModule,
    TransferModule,
    InterestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
