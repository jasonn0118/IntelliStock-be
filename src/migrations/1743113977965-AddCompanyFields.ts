import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyFields1743113977965 implements MigrationInterface {
    name = 'AddCompanyFields1743113977965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "exchange"`);
        await queryRunner.query(`ALTER TABLE "company" ADD "ceo" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "country" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "fullTimeEmployees" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "address" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "city" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "state" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "zip" character varying`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "company" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "company" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "zip"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "fullTimeEmployees"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "ceo"`);
        await queryRunner.query(`ALTER TABLE "company" ADD "exchange" character varying`);
    }

}
