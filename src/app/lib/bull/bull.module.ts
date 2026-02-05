import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppConfigService } from '../../../common/config/app-config.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: AppConfigService) => {
        const redisUrl = configService.redisUrl;
        const url = new URL(redisUrl || 'redis://localhost:6379');
        const host = url.hostname || 'localhost';
        const port = parseInt(url.port || '6379', 10);
        const db = url.pathname ? parseInt(url.pathname.slice(1), 10) : 0;

        return {
          redis: {
            host,
            port,
            db,
          },
        };
      },
      inject: [AppConfigService],
    }),
  ],
})
export class BullQueueModule {}
