import {
  Process,
  Processor,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { InterestService } from './interest.service';
import {
  INTEREST_QUEUE,
  PROCESS_WALLET_INTEREST,
} from '../../lib/bull/queue.constants';

@Processor(INTEREST_QUEUE)
export class InterestProcessor {
  constructor(private readonly interestService: InterestService) {}

  /**
   * Process wallet interest job
   */
  @Process(PROCESS_WALLET_INTEREST)
  async handleWalletInterest(job: Job<{ walletId: string; date: string }>) {
    const { walletId, date } = job.data;

    console.log(
      `[InterestProcessor] Processing interest for wallet ${walletId} on ${date}`,
    );

    try {
      // Call service to calculate and record interest accrual
      const result = await this.interestService.accrueInterestForWallet(
        walletId,
        new Date(date),
      );

      return { success: true, walletId, amount: result.amount };
    } catch (error) {
      // Log failure with attempt count
      console.error(
        `[InterestProcessor] Failed attempt ${job.attemptsMade}/${job.opts.attempts}: ${walletId}`,
        error.message,
      );
      throw error; // Re-throw to trigger Bull retry
    }
  }

  /**
   * Job completion handler
   */
  @OnQueueCompleted()
  onCompleted(_job: Job, result: any) {
    console.log(
      `[InterestProcessor] Completed: ${result.walletId}, Amount: ${result.amount}`,
    );
  }

  /**
   * Job failure handler
   */
  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    console.error(
      `[InterestProcessor] Failed after ${job.opts.attempts} attempts: ${job.data.walletId}`,
      error.message,
    );
  }
}
