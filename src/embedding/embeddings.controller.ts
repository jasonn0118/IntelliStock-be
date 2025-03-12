import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { EmbeddingsService } from "./embeddings.service";

@Controller('embeddings')
export class EmbeddingsController {
    constructor(private readonly embeddingsService: EmbeddingsService) {}

    @Post('create')
    async createEmbedding(@Body('input') input: string) {
      const document = await this.embeddingsService.embedAndSaveDocument(input);
      return {
        id: document.id,
        createdAt: document.createdAt,
      };
    }

    @Post('query')
    async queryDocuments(@Body('prompt') prompt: string) {
      const documents = await this.embeddingsService.queryDocuments(prompt);
      return { documents };
    }
  
    @Post('generate-response')
    async generateResponse(@Body('prompt') prompt: string) {
      const response = await this.embeddingsService.generateResponse(prompt);
      return { response };
    }
}