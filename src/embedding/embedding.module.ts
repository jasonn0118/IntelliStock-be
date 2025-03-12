import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingsService } from './embeddings.service';
import { Document } from '../document/document.entity';
import { EmbeddingsController } from './embeddings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingModule {}
