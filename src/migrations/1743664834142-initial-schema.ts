import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1743664834142 implements MigrationInterface {
  name = 'InitialSchema1743664834142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await queryRunner.query(
      `CREATE TABLE "company" ("id" SERIAL NOT NULL, "ticker" character varying NOT NULL, "name" character varying, "industry" character varying, "sector" character varying, "website" character varying, "description" text, "ceo" character varying, "country" character varying, "fullTimeEmployees" character varying, "phone" character varying, "address" character varying, "city" character varying, "state" character varying, "zip" character varying, "logoUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f9bc851aa95b7fbecba431daa3c" UNIQUE ("ticker"), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_statistic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "enterpriseValue" numeric, "forwardPE" numeric, "priceToBook" numeric, "enterpriseToRevenue" numeric, "enterpriseToEbitda" numeric, "profitMargins" numeric, "trailingEps" numeric, "sharesOutstanding" numeric, "floatShares" numeric, "heldPercentInsiders" numeric, "heldPercentInstitutions" numeric, "sharesShort" numeric, "shortRatio" numeric, "shortPercentOfFloat" numeric, "pegRatio" numeric, "week_change_52" numeric, "sp_week_change_52" numeric, "lastFiscalYearEnd" date, "mostRecentQuarter" date, "quoteId" uuid, "stockId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9fe7aaf8772622f16625687d07" UNIQUE ("quoteId"), CONSTRAINT "PK_77da764cbb376e03b9e83380ba5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_quote" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date, "open" numeric, "dayHigh" numeric, "dayLow" numeric, "yearLow" numeric, "yearHigh" numeric, "price" numeric, "priceAvg50" numeric, "priceAvg200" numeric, "adjClose" numeric, "volume" integer, "avgVolume" numeric, "change" numeric, "changesPercentage" numeric, "eps" numeric, "pe" numeric, "marketCap" numeric, "previousClose" numeric, "earningsAnnouncement" TIMESTAMP WITH TIME ZONE, "sharesOutstanding" numeric, "timestamp" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "stockId" uuid, CONSTRAINT "PK_fd94eda070b95fde2d06302cf56" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticker" character varying NOT NULL, "name" character varying NOT NULL, "exchange" character varying, "lastUpdated" TIMESTAMP, "companyId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5602443b4cca67e34f828c4632" UNIQUE ("ticker"), CONSTRAINT "REL_ae5da2f38f2ce30acf72ec3270" UNIQUE ("companyId"), CONSTRAINT "PK_092bc1fc7d860426a1dec5aa8e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('BASIC_USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying, "lastName" character varying, "email" character varying NOT NULL, "provider" character varying, "password" character varying, "isActive" boolean NOT NULL DEFAULT true, "accessToken" character varying, "refreshToken" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'BASIC_USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "watchlist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "stockId" uuid, CONSTRAINT "PK_0c8c0dbcc8d379117138e71ad5b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document" ("id" SERIAL NOT NULL, "type" character varying, "category" character varying, "date" date, "embedding" vector, "text" text, "ticker" character varying, "source" character varying, "reliabilityScore" double precision DEFAULT '1', "contentDate" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b3b8204da71b08c6c21e00f65" ON "document" ("ticker") `,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_9fe7aaf8772622f16625687d077" FOREIGN KEY ("quoteId") REFERENCES "stock_quote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_8fe2093a9d947e9d6c367d27658" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" ADD CONSTRAINT "FK_d716b29e9d19f39c4d0adfe09d4" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" ADD CONSTRAINT "FK_ae5da2f38f2ce30acf72ec3270e" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watchlist" ADD CONSTRAINT "FK_03878f3f177c680cc195900f80a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watchlist" ADD CONSTRAINT "FK_8cd0beadb4dd6c116ce8f917415" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector;`);

    await queryRunner.query(
      `ALTER TABLE "watchlist" DROP CONSTRAINT "FK_8cd0beadb4dd6c116ce8f917415"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watchlist" DROP CONSTRAINT "FK_03878f3f177c680cc195900f80a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" DROP CONSTRAINT "FK_ae5da2f38f2ce30acf72ec3270e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quote" DROP CONSTRAINT "FK_d716b29e9d19f39c4d0adfe09d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_statistic" DROP CONSTRAINT "FK_8fe2093a9d947e9d6c367d27658"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_statistic" DROP CONSTRAINT "FK_9fe7aaf8772622f16625687d077"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b3b8204da71b08c6c21e00f65"`,
    );
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TABLE "watchlist"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "stock"`);
    await queryRunner.query(`DROP TABLE "stock_quote"`);
    await queryRunner.query(`DROP TABLE "stock_statistic"`);
    await queryRunner.query(`DROP TABLE "company"`);
  }
}
