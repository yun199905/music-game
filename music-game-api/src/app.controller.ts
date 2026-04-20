import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DbHealthService } from './db-health.service';

@Controller()
export class AppController {
  constructor(private readonly dbHealthService: DbHealthService) {}

  @Get('health')
  async getHealth() {
    const db = await this.dbHealthService.check().catch((error: Error) => ({
      enabled: true,
      connected: false,
      reason: error.message,
    }));

    return {
      ok: db.connected || !db.enabled,
      service: 'music-game-api',
      timestamp: new Date().toISOString(),
      db,
    };
  }

  @Get('health/db')
  async getDatabaseHealth() {
    try {
      return await this.dbHealthService.check();
    } catch (error) {
      throw new ServiceUnavailableException({
        enabled: true,
        connected: false,
        reason: (error as Error).message,
      });
    }
  }
}
