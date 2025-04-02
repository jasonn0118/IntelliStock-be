import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/interceptors/serialize.interceptor';
import { WatchlistDto } from './dtos/watchlist.dto';
import { Watchlist } from './watchlist.entity';
import { WatchlistsService } from './watchlists.service';

@Controller('watchlists')
@Serialize(WatchlistDto)
@UseGuards(JwtAuthGuard)
export class WatchlistsController {
  constructor(private watchListsService: WatchlistsService) {}

  @Get()
  async getUserWatchList(@CurrentUser() user): Promise<WatchlistDto[]> {
    return this.watchListsService.getWatchList(user.id);
  }

  @Post()
  async addStockToWatchList(
    @CurrentUser() user,
    @Body() body: { ticker: string },
  ): Promise<Watchlist> {
    return this.watchListsService.addStockToWatchList(user.id, body.ticker);
  }

  @Post('remove')
  async removeStockFromWatchList(
    @CurrentUser() user,
    @Body() body: { ticker: string },
  ) {
    return this.watchListsService.removeStockFromWatchList(
      user.id,
      body.ticker,
    );
  }
}
