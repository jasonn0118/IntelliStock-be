import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Document } from '../document/document.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;

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

  async embedAndSaveDocument(input: string): Promise<Document> {
    const embedding = await this.createEmbedding(input);
    const document = this.documentRepository.create({
      embedding: this.convertEmbeddingToString(embedding),
      text: input,
    });
    return this.documentRepository.save(document);
  }

  async queryDocuments(prompt: string): Promise<Document[]> {
    const promptEmbedding = await this.createEmbedding(prompt);
    const promptVectorString = this.convertEmbeddingToString(promptEmbedding);

    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .orderBy('embedding <=> :promptEmbedding', 'ASC') // Using the '<=>' operator to order by cosine similarity
      .setParameter('promptEmbedding', promptVectorString)
      .limit(5)
      .getMany();

    return documents;
  }

  async generateResponse(prompt: string): Promise<string> {
    const relevantDocs = await this.queryDocuments(prompt);
    const context = relevantDocs.map((doc) => doc.text).join('\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Use the following document embeddings to answer the user query:',
        },
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
    });

    return completion.choices[0].message.content;
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
}
