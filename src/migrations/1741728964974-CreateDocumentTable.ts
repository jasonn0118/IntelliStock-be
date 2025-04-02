import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDocumentTable1743635964974 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "document" (
              "id" SERIAL NOT NULL, 
              "embedding" vector(1536),
              "text" text,
              "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
              "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
              CONSTRAINT "PK_document_id" PRIMARY KEY ("id")
            )
          `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "document"`);
    }

}
