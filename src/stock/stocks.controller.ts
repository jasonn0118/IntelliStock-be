import { Controller, Post } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksContoller {
  constructor(private readonly stocksService: StocksService) {}

  @Post('import-list')
  async importStockList() {
    await this.stocksService.importStockList();
  }
}
