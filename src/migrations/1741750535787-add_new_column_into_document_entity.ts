import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumnIntoDocumentEntity1741750535787 implements MigrationInterface {
    name = 'AddNewColumnIntoDocumentEntity1741750535787'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document" ADD "text" text`);
       
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "text"`);
    }

}
