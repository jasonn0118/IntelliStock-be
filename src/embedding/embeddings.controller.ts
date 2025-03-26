import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

// DTO for response generation request
interface GenerateResponseDto {
  prompt: string;
  userId?: string;
  type?: 'summary' | 'stock' | 'news' | 'exchange';
  category?:
    | 'top_gainers'
    | 'top_losers'
    | 'market_cap'
    | 'nasdaq_summary'
    | null;
  ticker?: string;
  date?: string; // ISO date string
}

// DTO for creating a market summary document
interface MarketSummaryDto {
  exchange: string;
  summaryText: string;
  date?: string; // ISO date string
}

// DTO for creating a top movers document
interface TopMoversDto {
  category: 'top_gainers' | 'top_losers';
  stocksData: string;
  date?: string; // ISO date string
}

// DTO for creating an exchange metrics document
interface ExchangeMetricsDto {
  exchange: string;
  metricsData: string;
  date?: string; // ISO date string
}

@Controller('embeddings')
export class EmbeddingsController {
  private readonly logger = new Logger(EmbeddingsController.name);

  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post('create')
  async createEmbedding(@Body() documentData: any) {
    try {
      const document =
        await this.embeddingsService.embedAndSaveDocument(documentData);
      return {
        id: document.id,
        createdAt: document.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error creating embedding: ${error.message}`);
      throw new HttpException(
        'Failed to create embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('query')
  async queryDocuments(
    @Body('prompt') prompt: string,
    @Body('type') type?: 'summary' | 'stock' | 'news' | 'exchange',
    @Body('category')
    category?:
      | 'top_gainers'
      | 'top_losers'
      | 'market_cap'
      | 'nasdaq_summary'
      | null,
    @Body('ticker') ticker?: string,
    @Body('date') dateStr?: string,
  ) {
    try {
      if (!prompt || prompt.trim().length === 0) {
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      let date: Date | undefined;
      if (dateStr) {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new HttpException(
            'Invalid date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const filters = { type, category, ticker, date };
      const documents = await this.embeddingsService.queryDocuments(
        prompt,
        filters,
      );

      return {
        count: documents.length,
        documents: documents.map((doc) => ({
          id: doc.id,
          text: doc.text,
          type: doc.type,
          category: doc.category,
          ticker: doc.ticker,
          date: doc.date,
          source: doc.source,
        })),
      };
    } catch (error) {
      this.logger.error(`Error querying documents: ${error.message}`);
      throw new HttpException(
        'Failed to query documents',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-response')
  async generateResponse(@Body() data: GenerateResponseDto) {
    try {
      if (!data.prompt || data.prompt.trim().length === 0) {
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      const { prompt, userId = 'default', type, category, ticker, date } = data;

      // Convert date string to Date object if provided
      let dateObj: Date | undefined;
      if (date) {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          throw new HttpException(
            'Invalid date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const filters = { type, category, ticker, date: dateObj };
      const response = await this.embeddingsService.generateResponse(
        prompt,
        userId,
        filters,
      );
      return { response };
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      return {
        response:
          "I'm sorry, I encountered an error processing your request. Please try again later.",
        error: error.message,
      };
    }
  }

  @Post('market-summary')
  async createMarketSummary(@Body() data: MarketSummaryDto) {
    try {
      if (!data.exchange || !data.summaryText) {
        throw new HttpException(
          'Exchange and summaryText are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      let date: Date | undefined;
      if (data.date) {
        date = new Date(data.date);
        if (isNaN(date.getTime())) {
          throw new HttpException(
            'Invalid date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const document = await this.embeddingsService.createMarketSummaryDocument(
        data.exchange,
        data.summaryText,
        date,
      );

      return {
        id: document.id,
        type: document.type,
        category: document.category,
        date: document.date,
        createdAt: document.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error creating market summary: ${error.message}`);
      throw new HttpException(
        'Failed to create market summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('top-movers')
  async createTopMovers(@Body() data: TopMoversDto) {
    try {
      if (!data.category || !data.stocksData) {
        throw new HttpException(
          'Category and stocksData are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      let date: Date | undefined;
      if (data.date) {
        date = new Date(data.date);
        if (isNaN(date.getTime())) {
          throw new HttpException(
            'Invalid date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const document = await this.embeddingsService.createTopMoversDocument(
        data.category,
        data.stocksData,
        date,
      );

      return {
        id: document.id,
        type: document.type,
        category: document.category,
        date: document.date,
        createdAt: document.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error creating top movers document: ${error.message}`);
      throw new HttpException(
        'Failed to create top movers document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('exchange-metrics')
  async createExchangeMetrics(@Body() data: ExchangeMetricsDto) {
    try {
      if (!data.exchange || !data.metricsData) {
        throw new HttpException(
          'Exchange and metricsData are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      let date: Date | undefined;
      if (data.date) {
        date = new Date(data.date);
        if (isNaN(date.getTime())) {
          throw new HttpException(
            'Invalid date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const document =
        await this.embeddingsService.createExchangeMetricsDocument(
          data.exchange,
          data.metricsData,
          date,
        );

      return {
        id: document.id,
        type: document.type,
        date: document.date,
        createdAt: document.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Error creating exchange metrics document: ${error.message}`,
      );
      throw new HttpException(
        'Failed to create exchange metrics document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('conversation')
  async clearConversation(@Query('userId') userId: string = 'default') {
    try {
      this.embeddingsService.clearConversationHistory(userId);
      return { success: true, message: 'Conversation history cleared' };
    } catch (error) {
      this.logger.error(`Error clearing conversation: ${error.message}`);
      throw new HttpException(
        'Failed to clear conversation history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversation')
  async getConversationHistory(@Query('userId') userId: string = 'default') {
    try {
      const history = this.embeddingsService.getConversationHistory(userId);
      return {
        userId,
        messageCount: history.length,
        history,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving conversation history: ${error.message}`,
      );
      throw new HttpException(
        'Failed to retrieve conversation history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
