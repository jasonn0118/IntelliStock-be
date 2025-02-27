import { Module } from '@nestjs/common';
import { Watchlist } from './watchlist.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsService } from './watchlists.service';
import { User } from 'src/users/user.entity';
import { Stock } from 'src/stock/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist, User, Stock])],
  controllers: [WatchlistsController],
  providers: [WatchlistsService],
  exports: [WatchlistsService],
})
export class WatchlistModule {}
