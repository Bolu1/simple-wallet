import { Controller, Get } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';

/**
 * Wallet Controller - HTTP endpoints for wallet operations
 */
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get all wallets on the platform
   *
   * @returns Array of all wallets
   */
  @Get()
  async getAllWallets(): Promise<Wallet[]> {
    return this.walletService.getAllWallets();
  }
}
