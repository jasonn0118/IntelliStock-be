import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyLogoUrl1743116793122 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD COLUMN "logoUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "logoUrl"`);
  }
}
