import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStockQuoteEntity1742448430631 implements MigrationInterface {
  name = 'UpdateStockQuoteEntity1742448430631';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD "marketCap" numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD "previousClose" numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD "earningsAnnouncement" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD "sharesOutstanding" numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD "timestamp" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP COLUMN "timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP COLUMN "sharesOutstanding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP COLUMN "earningsAnnouncement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP COLUMN "previousClose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP COLUMN "marketCap"`,
    );
  }
}
