import { Controller, Get, Param, Post } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { StockDto } from './dtos/stock.dto';

@Controller('stocks')
@Serialize(StockDto)
export class StocksContoller {
  constructor(private readonly stocksService: StocksService) {}

  @Post('import-list')
  async importStockList() {
    await this.stocksService.importStockList();
  }

  @Get('symbols')
  async getSymbols() {
    return this.stocksService.getAllSymbols();
  }

  @Get(':ticker')
  async getStock(@Param('ticker') ticker: string) {
    return this.stocksService.getStock(ticker);
  }
}
