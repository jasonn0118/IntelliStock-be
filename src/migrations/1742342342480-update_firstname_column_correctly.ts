import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFirstnameColumnCorrectly1742342342480
  implements MigrationInterface
{
  name = 'UpdateFirstnameColumnCorrectly1742342342480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "fisrtName" TO "firstName"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "firstName" TO "fisrtName"`,
    );
  }
}
