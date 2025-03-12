import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingsColumnIntoDocumentTable1741729988573
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "document"
            ADD COLUMN "embedding" vector(1536);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "document"
            DROP COLUMN "embedding";
        `);
  }
}
