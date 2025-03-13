import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WatchlistsService } from './watchlists.service';
import { Watchlist } from './watchlist.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WatchlistDto } from './dtos/watchlist.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';

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
