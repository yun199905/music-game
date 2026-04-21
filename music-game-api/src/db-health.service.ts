import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class DbHealthService {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly dataSource: DataSource,
  ) {}

  async check() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      return {
        enabled: false,
        connected: false,
        reason: 'DATABASE_URL is not configured',
      };
    }

    if (!this.dataSource) {
      return {
        enabled: true,
        connected: false,
        reason: 'DataSource is not available',
      };
    }

    if (!this.dataSource.isInitialized) {
      return {
        enabled: true,
        connected: false,
        reason: 'DataSource is not initialized',
      };
    }

    await this.dataSource.query('select 1');

    return {
      enabled: true,
      connected: true,
      database: this.dataSource.options.type,
    };
  }
}
