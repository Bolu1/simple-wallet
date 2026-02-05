import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { AppConfigService } from '../config/app-config.service';

export const getDatabaseConfig = (configService: AppConfigService): SequelizeModuleOptions => {
  const env = configService.applicationEnv;
  const databaseUrl = configService.databaseUrl;

  return {
    dialect: 'postgres',
    uri: databaseUrl,
    autoLoadModels: true,
    synchronize: env !== 'production', // Auto-create tables in development
    logging: env === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  } as SequelizeModuleOptions;
};
