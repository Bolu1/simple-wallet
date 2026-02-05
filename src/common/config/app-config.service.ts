import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config.interface';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    const value = this.configService.get<string>(key);

    // Handle type conversions
    if (key === 'APPLICATION_PORT') {
      return (value ? parseInt(value, 10) : 3000) as AppConfig[K];
    }

    return value as AppConfig[K];
  }

  get applicationPort(): number {
    return this.get('APPLICATION_PORT');
  }

  get applicationEnv(): string {
    return this.get('APPLICATION_ENV');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get redisHost(): string {
    return this.get('REDIS_HOST');
  }

  get redisPort(): number {
    return this.get('REDIS_PORT');
  }
}
