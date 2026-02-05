import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { Transaction } from '../../transfer/entities/transaction.entity';
import { Currency } from '../../../../common/types/transaction.types';

@Table({
  tableName: 'wallets',
  timestamps: true,
})
export class Wallet extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false,
  })
  balance: number;

  @Column({
    type: DataType.ENUM(...Object.values(Currency)),
    defaultValue: Currency.NGN,
    allowNull: false,
  })
  currency: Currency;

  @BelongsTo(() => User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  })
  user: User;

  @HasMany(() => Transaction, {
    foreignKey: 'fromWalletId',
    as: 'sentTransactions',
    onDelete: 'CASCADE',
  })
  sentTransactions: Transaction[];

  @HasMany(() => Transaction, {
    foreignKey: 'toWalletId',
    as: 'receivedTransactions',
    onDelete: 'CASCADE',
  })
  receivedTransactions: Transaction[];
}
