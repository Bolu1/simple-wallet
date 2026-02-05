import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Wallet } from '../../wallet/entities/wallet.entity';

@Table({
  tableName: 'interest_accruals',
  timestamps: true,
})
export class InterestAccrual extends Model {
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
    allowNull: false,
  })
  walletId: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  balance: number;

  @Index
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  calculatedDate: Date;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: false,
  })
  annualRate: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  daysInYear: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  @Unique('interest_accruals_wallet_date_unique')
  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  uniqueKey: string;

  @BelongsTo(() => Wallet, {
    foreignKey: 'walletId',
    as: 'wallet',
    onDelete: 'CASCADE',
  })
  wallet: Wallet;
}
