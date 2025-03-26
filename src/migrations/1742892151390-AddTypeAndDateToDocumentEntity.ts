import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeAndDateToDocumentEntity1742892151390
  implements MigrationInterface
{
  name = 'AddTypeAndDateToDocumentEntity1742892151390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c214c6343bbd5e9659a72b727"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "type" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "document" ADD "date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "date"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_3c214c6343bbd5e9659a72b727" ON "document" ("category") `,
    );
  }
}
