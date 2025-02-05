import { Controller, Get, Param, Post } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksContoller {
  constructor(private readonly stocksService: StocksService) {}

  @Post('import-list')
  async importStockList() {
    await this.stocksService.importStockList();
  }

  @Get(':ticker')
  async getStock(@Param('ticker') ticker: string) {
    return this.stocksService.getStock(ticker);
  }
}
