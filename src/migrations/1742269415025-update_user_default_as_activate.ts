import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserDefaultAsActivate1742269415025
  implements MigrationInterface
{
  name = 'UpdateUserDefaultAsActivate1742269415025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "isActive" SET DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "isActive" SET DEFAULT false`,
    );
  }
}
