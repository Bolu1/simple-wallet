import {
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Wallet } from '../../wallet/entities/wallet.entity';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Unique('users_email_unique')
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email: string;

  @HasMany(() => Wallet, {
    foreignKey: 'userId',
    as: 'wallets',
    onDelete: 'CASCADE',
  })
  wallets: Wallet[];
}
