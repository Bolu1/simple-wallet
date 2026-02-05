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
  Unique,
} from 'sequelize-typescript';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { TransactionLog } from './transaction-log.entity';
import { Currency, TransactionStatus } from '../../../../common/types/transaction.types';

@Table({
  tableName: 'transactions',
  timestamps: true,
})
export class Transaction extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Index
  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  fromWalletId: string;

  @Index
  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  toWalletId: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(Currency)),
    defaultValue: Currency.USD,
    allowNull: false,
  })
  currency: Currency;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    defaultValue: TransactionStatus.PENDING,
    allowNull: false,
  })
  status: TransactionStatus;

  @Unique('transactions_idempotency_key_unique')
  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  idempotencyKey: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  @BelongsTo(() => Wallet, {
    foreignKey: 'fromWalletId',
    as: 'fromWallet',
  })
  fromWallet: Wallet;

  @BelongsTo(() => Wallet, {
    foreignKey: 'toWalletId',
    as: 'toWallet',
  })
  toWallet: Wallet;

  @HasMany(() => TransactionLog, {
    foreignKey: 'transactionId',
    as: 'logs',
    onDelete: 'CASCADE',
  })
  logs: TransactionLog[];
}
