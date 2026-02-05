import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Wallet } from './entities/wallet.entity';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [SequelizeModule.forFeature([Wallet])],
  providers: [WalletRepository, WalletService],
  controllers: [WalletController],
  exports: [WalletRepository, WalletService],
})
export class WalletModule {}
