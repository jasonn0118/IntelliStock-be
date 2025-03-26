import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { Document } from '../document/document.entity';

// Define document creation interface
interface CreateDocumentDto {
  text: string;
  type?: 'summary' | 'stock' | 'news' | 'exchange';
  category?:
    | 'top_gainers'
    | 'top_losers'
    | 'market_cap'
    | 'nasdaq_summary'
    | 'stock_quote'
    | null;
  date?: Date;
  ticker?: string;
  source?: string;
  reliabilityScore?: number;
  contentDate?: Date;
}

// Define interface for chat messages
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;
  private readonly logger = new Logger(EmbeddingsService.name);
  // In-memory store for conversation histories, keyed by userId
  private conversationHistories: Map<string, ChatMessage[]> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {
    this.openai = new OpenAI(this.configService.get('OPENAI_API_KEY'));
  }

  async createEmbedding(input: string): Promise<number[]> {
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    return embeddingResponse.data[0].embedding;
  }

  async embedAndSaveDocument(
    input: string | CreateDocumentDto,
  ): Promise<Document> {
    let text: string;
    let type: 'summary' | 'stock' | 'news' | 'exchange' | undefined;
    let category:
      | 'top_gainers'
      | 'top_losers'
      | 'market_cap'
      | 'nasdaq_summary'
      | 'stock_quote'
      | null
      | undefined;
    let date: Date | undefined;
    let ticker: string | undefined;
    let source: string | undefined;
    let reliabilityScore: number | undefined;
    let contentDate: Date | undefined;

    if (typeof input === 'string') {
      text = input;
    } else {
      text = input.text;
      type = input.type;
      category = input.category;
      date = input.date;
      ticker = input.ticker;
      source = input.source;
      reliabilityScore = input.reliabilityScore;
      contentDate = input.contentDate;
    }

    const embedding = await this.createEmbedding(text);
    const document = this.documentRepository.create({
      embedding: this.convertEmbeddingToString(embedding),
      text,
      type,
      category,
      date,
      ticker,
      source,
      reliabilityScore,
      contentDate,
    });

    return this.documentRepository.save(document);
  }

  async queryDocuments(
    prompt: string,
    filters?: {
      type?: 'summary' | 'stock' | 'news' | 'exchange';
      category?:
        | 'top_gainers'
        | 'top_losers'
        | 'market_cap'
        | 'nasdaq_summary'
        | null;
      ticker?: string;
      date?: Date;
    },
    similarityThreshold: number = 0.7,
  ): Promise<Document[]> {
    const promptEmbedding = await this.createEmbedding(prompt);
    const promptVectorString = this.convertEmbeddingToString(promptEmbedding);

    let query = this.documentRepository
      .createQueryBuilder('document')
      .orderBy('embedding <=> :promptEmbedding', 'ASC')
      .setParameter('promptEmbedding', promptVectorString);

    // Apply filters if provided
    if (Object.values(filters).length > 0) {
      this.logger.log({
        filters,
      });
      if (filters.type) {
        query = query.andWhere('document.type = :type', { type: filters.type });
      }

      if (filters.category) {
        query = query.andWhere('document.category = :category', {
          category: filters.category,
        });
      }

      if (filters.ticker) {
        query = query.andWhere('document.ticker = :ticker', {
          ticker: filters.ticker,
        });
      }

      if (filters.date) {
        query = query.andWhere('document.date = :date', { date: filters.date });
      }
    }

    this.logger.log({
      query: query.getQueryAndParameters(),
    });

    // Get documents with similarity score
    const documents = await query.limit(10).getMany();
    // Filter out documents with similarity below threshold if using pgvector
    // Since we're using TypeORM, this would require custom handling
    // For now, we'll fetch more documents and limit to the most relevant ones
    return documents.slice(0, 5);
  }

  /**
   * Generate a response to a user prompt, maintaining conversation history
   * @param prompt The user's question or prompt
   * @param userId A unique identifier for the user to maintain their conversation history
   * @param filters Optional filters to apply when searching for relevant documents
   * @returns The AI-generated response
   */
  async generateResponse(
    prompt: string,
    userId: string = 'default',
    filters?: {
      type?: 'summary' | 'stock' | 'news' | 'exchange';
      category?:
        | 'top_gainers'
        | 'top_losers'
        | 'market_cap'
        | 'nasdaq_summary'
        | null;
      ticker?: string;
      date?: Date;
    },
  ): Promise<string> {
    try {
      // Extract potential ticker symbols from the prompt
      const tickerPattern = /\$([A-Z]{1,5})\b/g;
      const tickerMatches = [...prompt.matchAll(tickerPattern)];
      const extractedTickers = tickerMatches.map((match) => match[1]);

      // If ticker symbol found in prompt, add to filters
      if (extractedTickers.length > 0 && !filters?.ticker) {
        filters = { ...filters, ticker: extractedTickers[0] };
      }

      // Check for market summary or exchange specific queries
      const marketSummaryPattern =
        /\b(market summary|market overview|exchange overview)\b/i;
      const exchangePattern = /\b(nasdaq|nyse|dow)\b/i;
      const topGainersPattern =
        /\b(top gainers|best performing|biggest winners)\b/i;
      const topLosersPattern =
        /\b(top losers|worst performing|biggest losers)\b/i;

      // Add type and category filters based on query patterns
      if (!filters?.type && !filters?.category) {
        if (marketSummaryPattern.test(prompt)) {
          filters = { ...filters, type: 'summary' };

          if (prompt.toLowerCase().includes('nasdaq')) {
            filters.category = 'nasdaq_summary';
          }
        } else if (topGainersPattern.test(prompt)) {
          filters = { ...filters, type: 'summary', category: 'top_gainers' };
        } else if (topLosersPattern.test(prompt)) {
          filters = { ...filters, type: 'summary', category: 'top_losers' };
        }
      }

      // Get relevant documents based on the prompt and filters
      const relevantDocs = await this.queryDocuments(prompt, filters);

      // If no relevant documents found, return a specific message
      if (relevantDocs.length === 0) {
        this.logger.warn(`No relevant documents found for prompt: "${prompt}"`);
        return "I don't have any information about that in my dataset. Please ask about something related to the stocks in our system.";
      }

      const context = relevantDocs
        .map((doc) => {
          let docText = doc.text;

          // Add metadata to the context if available
          const metadataParts = [];
          if (doc.type) metadataParts.push(`Type: ${doc.type}`);
          if (doc.category) metadataParts.push(`Category: ${doc.category}`);
          if (doc.ticker) metadataParts.push(`Stock: ${doc.ticker}`);
          if (doc.date) metadataParts.push(`Date: ${doc.date}`);
          if (doc.source) metadataParts.push(`Source: ${doc.source}`);

          if (metadataParts.length > 0) {
            docText = `[${metadataParts.join(' | ')}]\n${docText}`;
          }

          return docText;
        })
        .join('\n\n');

      // Initialize conversation history for this user if it doesn't exist
      if (!this.conversationHistories.has(userId)) {
        this.conversationHistories.set(userId, []);
      }

      // Get the conversation history for this user
      const history = this.conversationHistories.get(userId);

      // Prepare messages array with system instructions, context, history, and current prompt
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a financial assistant that provides information EXCLUSIVELY from the document context provided.

STRICT INSTRUCTIONS:
1. ONLY answer based on the provided document context. DO NOT use any external knowledge.
2. If the information is not in the provided context, respond with: "I don't have that information in my dataset."
3. Never make up or infer information that isn't explicitly stated in the context.
4. When mentioning stocks, always refer to them by their ticker symbol.
5. Keep your answers factual and directly tied to the provided context data.
6. Do not hallucinate features, numbers, or analysis that isn't present in the data.
7. Maintain conversation history for context, but still only respond with information from the dataset.`,
        },
        {
          role: 'system',
          content: `CONTEXT INFORMATION:\n${context}`,
        },
        // Include up to the last 5 conversation turns (to keep within token limits)
        ...history.slice(-10),
        // Add the current user message
        { role: 'user', content: prompt },
      ];

      // Generate response from OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;

      // Update conversation history with this interaction
      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: response });

      // Keep history to a reasonable size (limit to last 20 messages)
      if (history.length > 20) {
        const newHistory = history.slice(history.length - 20);
        this.conversationHistories.set(userId, newHistory);
      }

      return response;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      return `I encountered an error while generating a response. Please try again later.`;
    }
  }

  /**
   * Clear the conversation history for a specific user
   * @param userId The user ID whose conversation history should be cleared
   */
  clearConversationHistory(userId: string = 'default'): void {
    this.conversationHistories.set(userId, []);
    this.logger.log(`Cleared conversation history for user: ${userId}`);
  }

  /**
   * Get the current conversation history for a user
   * @param userId The user ID whose conversation history to retrieve
   * @returns Array of chat messages representing the conversation
   */
  getConversationHistory(userId: string = 'default'): ChatMessage[] {
    return this.conversationHistories.get(userId) || [];
  }

  convertEmbeddingToString(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  parseEmbeddingString(embedding: string): number[] {
    return embedding
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(Number);
  }

  /**
   * Create and store a daily market summary document
   * @param exchange The exchange name (e.g., 'NASDAQ', 'NYSE')
   * @param summaryText The formatted summary text
   * @param date The date for this summary
   * @returns The saved document
   */
  async createMarketSummaryDocument(
    exchange: string,
    summaryText: string,
    date: Date = new Date(),
  ): Promise<Document> {
    const category = exchange.toLowerCase().includes('nasdaq')
      ? 'nasdaq_summary'
      : null;

    return this.embedAndSaveDocument({
      text: summaryText,
      type: 'summary',
      category,
      date,
      source: 'Market Data Processor',
      reliabilityScore: 1.0,
    });
  }

  /**
   * Create and store a document for top gainers or losers
   * @param type Whether these are top gainers or losers
   * @param stocksData The formatted text describing the top stocks
   * @param date The date for this data
   * @returns The saved document
   */
  async createTopMoversDocument(
    category: 'top_gainers' | 'top_losers',
    stocksData: string,
    date: Date = new Date(),
  ): Promise<Document> {
    return this.embedAndSaveDocument({
      text: stocksData,
      type: 'summary',
      category,
      date,
      source: 'Market Data Processor',
      reliabilityScore: 1.0,
    });
  }

  /**
   * Create and store a document for exchange-wide metrics
   * @param exchange The exchange name
   * @param metricsData The formatted text with market metrics
   * @param date The date of these metrics
   * @returns The saved document
   */
  async createExchangeMetricsDocument(
    exchange: string,
    metricsData: string,
    date: Date = new Date(),
  ): Promise<Document> {
    return this.embedAndSaveDocument({
      text: metricsData,
      type: 'exchange',
      date,
      source: 'Market Data Processor',
      reliabilityScore: 1.0,
    });
  }
}
