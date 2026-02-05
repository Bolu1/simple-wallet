export class AccrueInterestResponseDto {
  id: string;
  walletId: string;
  amount: number;
  balance: number;
  calculatedDate: Date;
  annualRate: number;
  daysInYear: number;
  metadata: Record<string, any>;
  createdAt: Date;
}
