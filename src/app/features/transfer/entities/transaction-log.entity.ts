import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Transaction } from './transaction.entity';
import { TransactionStatus } from '../../../../common/types/transaction.types';

@Table({
  tableName: 'transaction_logs',
  timestamps: true,
})
export class TransactionLog extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  transactionId: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
  })
  status: TransactionStatus;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  @BelongsTo(() => Transaction, {
    foreignKey: 'transactionId',
    as: 'transaction',
  })
  transaction: Transaction;
}
