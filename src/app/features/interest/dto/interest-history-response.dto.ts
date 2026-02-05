import { AccrueInterestResponseDto } from './accrue-interest-response.dto';

export class InterestHistoryResponseDto {
  walletId: string;
  startDate: Date;
  endDate: Date;
  totalInterest: number;
  accruals: AccrueInterestResponseDto[];
  pagination: {
    offset: number;
    limit: number;
    count: number;
  };
}
