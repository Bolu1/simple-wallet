import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AppConfigModule } from '../common/config/app-config.module';
import { UserModule } from './features/user/user.module';
import { WalletModule } from './features/wallet/wallet.module';
import { TransferModule } from './features/transfer/transfer.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UserModule, WalletModule, TransferModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
