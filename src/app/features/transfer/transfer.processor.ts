import {
  Process,
  Processor,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { TransferService } from './transfer.service';
import {
  TRANSFER_QUEUE,
  PROCESS_TRANSFER,
} from '../../lib/bull/queue.constants';

@Processor(TRANSFER_QUEUE)
export class TransferProcessor {
  constructor(private readonly transferService: TransferService) {}

  /**
   * Process transfer job
   */
  @Process(PROCESS_TRANSFER)
  async handleTransfer(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;

    console.log(`[TransferProcessor] Processing transaction ${transactionId}`);

    try {
      await this.transferService.processTransfer(transactionId);
      return { success: true, transactionId };
    } catch (error) {
      console.error(
        `[TransferProcessor] Failed attempt ${job.attemptsMade}/${job.opts.attempts}: ${transactionId}`,
        error.message,
      );
      throw error; // Re-throw to trigger Bull retry
    }
  }

  /**
   * On job completed successfully
   */
  @OnQueueCompleted()
  onCompleted(_job: Job, result: any) {
    console.log(`[TransferProcessor] Completed: ${result.transactionId}`);
  }

  /**
   * On job failed (after all retry attempts exhausted)
   * Job moves to failed jobs list (Dead Letter Queue)
   */
  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    console.error(
      `[TransferProcessor] Failed after ${job.opts.attempts} attempts: ${job.data.transactionId}`,
      error.message,
    );
  }
}
