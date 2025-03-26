import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToDocumentEntity1742873819468
  implements MigrationInterface
{
  name = 'AddMetadataToDocumentEntity1742873819468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "category" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "ticker" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "source" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "reliabilityScore" double precision NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "contentDate" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c214c6343bbd5e9659a72b727" ON "document" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b3b8204da71b08c6c21e00f65" ON "document" ("ticker") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b3b8204da71b08c6c21e00f65"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c214c6343bbd5e9659a72b727"`,
    );
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "contentDate"`);
    await queryRunner.query(
      `ALTER TABLE "document" DROP COLUMN "reliabilityScore"`,
    );
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "source"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "ticker"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "category"`);
  }
}
