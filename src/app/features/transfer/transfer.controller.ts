import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionLogRepository } from './repositories/transaction-log.repository';
import { TransferRequestDto, TransferResponseDto } from './dto';

@Controller('transfer')
export class TransferController {
  constructor(
    private readonly transferService: TransferService,
    private readonly transactionRepo: TransactionRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
  ) {}

  /**
   * POST /api/v1/transfer
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async transfer(
    @Body() dto: TransferRequestDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ): Promise<TransferResponseDto> {
    // Validate idempotency key header exists
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException(
        'x-idempotency-key header is required'
      );
    }

    // Validate UUID v4 format
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(idempotencyKey)) {
      throw new BadRequestException(
        'x-idempotency-key must be a valid UUID v4'
      );
    }

    return await this.transferService.initiateTransfer(
      dto,
      idempotencyKey
    );
  }

  /**
   * GET /api/v1/transfer/:id
   */
  @Get(':id')
  async getTransfer(
    @Param('id') id: string,
  ): Promise<TransferResponseDto> {
    const transaction = await this.transactionRepo.findById(id);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    return {
      id: transaction.id,
      fromWalletId: transaction.fromWalletId,
      toWalletId: transaction.toWalletId,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency,
      status: transaction.status,
      idempotencyKey: transaction.idempotencyKey,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

}
