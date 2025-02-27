import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Watchlist } from './watchlist.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { Stock } from 'src/stock/stock.entity';

@Injectable()
export class WatchlistsService {
  constructor(
    @InjectRepository(Watchlist)
    private watchListRepository: Repository<Watchlist>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
  ) {}

  async addStockToWatchList(userId: number, ticker: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stock = await this.stockRepository.findOne({ where: { ticker } });

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    const existingWatchListEntry = await this.watchListRepository.findOne({
      where: { user: { id: userId }, stock: { ticker } },
    });

    if (existingWatchListEntry) {
      throw new ConflictException('Stock already exists in your watchlist');
    }

    const watchListEntry = this.watchListRepository.create({
      user,
      stock,
    });

    return this.watchListRepository.save(watchListEntry);
  }

  async getWatchList(userId: number): Promise<Watchlist[]> {
    return await this.watchListRepository.find({
      where: { user: { id: userId } },
      relations: ['stock'],
    });
  }

  async removeStockFromWatchList(userId: number, ticker: string) {
    const watchListEntry = await this.watchListRepository.findOne({
      where: { user: { id: userId }, stock: { ticker } },
    });

    if (!watchListEntry) {
      throw new NotFoundException('Stock not in watchlist');
    }

    return this.watchListRepository.remove(watchListEntry);
  }
}
