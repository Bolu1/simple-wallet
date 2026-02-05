import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Wallet } from './entities/wallet.entity';
import { WalletRepository } from './repositories/wallet.repository';

@Module({
  imports: [SequelizeModule.forFeature([Wallet])],
  providers: [WalletRepository],
  exports: [WalletRepository],
})
export class WalletModule {}
