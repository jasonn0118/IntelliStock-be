import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToDocumentEntity1742874141014
  implements MigrationInterface
{
  name = 'AddMetadataToDocumentEntity1742874141014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "reliabilityScore" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "reliabilityScore" SET NOT NULL`,
    );
  }
}
