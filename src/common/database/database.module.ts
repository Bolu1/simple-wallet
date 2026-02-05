import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppConfigService } from '../config/app-config.service';
import { getDatabaseConfig } from './database.config';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: (configService: AppConfigService) => {
        return getDatabaseConfig(configService);
      },
      inject: [AppConfigService],
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
