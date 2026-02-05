import { Injectable } from '@nestjs/common';
import { WalletRepository } from './repositories/wallet.repository';
import { Wallet } from './entities/wallet.entity';

/**
 * Wallet Service - Handles wallet business logic
 */
@Injectable()
export class WalletService {
  constructor(private readonly walletRepo: WalletRepository) {}

  /**
   * Get all wallets on the platform
   *
   * @returns Array of all wallets
   */
  async getAllWallets(): Promise<Wallet[]> {
    return this.walletRepo.findAll();
  }

  /**
   * Get wallet by ID
   *
   * @param id - Wallet UUID
   * @returns Wallet or null if not found
   */
  async getWalletById(id: string): Promise<Wallet | null> {
    return this.walletRepo.findById(id);
  }

  /**
   * Get wallets by user ID
   *
   * @param userId - User UUID
   * @returns Array of wallets for user
   */
  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findByUserId(userId);
  }
}
