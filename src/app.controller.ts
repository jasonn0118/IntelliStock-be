import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  async healthCheck(): Promise<{ status: string }> {
    const isConnected = await this.dataSource.isInitialized;
    return { status: isConnected ? 'UP' : 'DOWN' };
  }
}
