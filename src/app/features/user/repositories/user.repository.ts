import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findAll(): Promise<User[]> {
    return this.userModel.findAll();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { email },
    });
  }

  async create(data: { name: string; email: string }): Promise<User> {
    return this.userModel.create(data);
  }

  async update(id: string, data: { name?: string; email?: string }): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.update(data);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) {
      await user.destroy();
    }
  }

  async findWithWallets(id: string): Promise<User | null> {
    return this.userModel.findByPk(id, {
      include: [
        {
          model: require('../../wallet/entities/wallet.entity').Wallet,
          as: 'wallets',
        },
      ],
    });
  }
}
