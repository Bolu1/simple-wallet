import { NestFactory } from '@nestjs/core';
import { Sequelize } from 'sequelize-typescript';
import { AppModule } from '../../../app/app.module';
import { User } from '../../../app/features/user/entities/user.entity';
import { Wallet } from '../../../app/features/wallet/entities/wallet.entity';
import { Currency } from '../../types/transaction.types';

async function seed() {
  try {
    const app = await NestFactory.create(AppModule);
    const sequelize = app.get(Sequelize);

    // Sync database
    await sequelize.sync();

    console.log('✓ Database tables synced');

    // Check if users already exist
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('✓ Users already exist, skipping seeding');
      await app.close();
      return;
    }

    // Create users
    const alice = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
    });

    const bob = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
    });

    console.log('✓ Created users');

    // Create wallets
    await Wallet.create({
      userId: alice.id,
      balance: 10000.00,
      currency: Currency.NGN,
    });

    await Wallet.create({
      userId: bob.id,
      balance: 5000.00,
      currency: Currency.NGN,
    });

    console.log('✓ Created wallets');
    console.log('✓ Seeding completed successfully');

    await app.close();
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
