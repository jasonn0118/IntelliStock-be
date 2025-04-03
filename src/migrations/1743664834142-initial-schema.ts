import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1743664834142 implements MigrationInterface {
  name = 'InitialSchema1743664834142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and create extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Check if company table exists before creating
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      await queryRunner.query(
        `CREATE TABLE "company" ("id" SERIAL NOT NULL, "ticker" character varying NOT NULL, "name" character varying, "industry" character varying, "sector" character varying, "website" character varying, "description" text, "ceo" character varying, "country" character varying, "fullTimeEmployees" character varying, "phone" character varying, "address" character varying, "city" character varying, "state" character varying, "zip" character varying, "logoUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f9bc851aa95b7fbecba431daa3c" UNIQUE ("ticker"), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
      );
    }

    // Check if stock_statistic table exists before creating
    const stockStatisticTableExists =
      await queryRunner.hasTable('stock_statistic');
    if (!stockStatisticTableExists) {
      await queryRunner.query(
        `CREATE TABLE "stock_statistic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "enterpriseValue" numeric, "forwardPE" numeric, "priceToBook" numeric, "enterpriseToRevenue" numeric, "enterpriseToEbitda" numeric, "profitMargins" numeric, "trailingEps" numeric, "sharesOutstanding" numeric, "floatShares" numeric, "heldPercentInsiders" numeric, "heldPercentInstitutions" numeric, "sharesShort" numeric, "shortRatio" numeric, "shortPercentOfFloat" numeric, "pegRatio" numeric, "week_change_52" numeric, "sp_week_change_52" numeric, "lastFiscalYearEnd" date, "mostRecentQuarter" date, "quoteId" uuid, "stockId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9fe7aaf8772622f16625687d07" UNIQUE ("quoteId"), CONSTRAINT "PK_77da764cbb376e03b9e83380ba5" PRIMARY KEY ("id"))`,
      );
    }

    // Check if stock_quote table exists before creating
    const stockQuoteTableExists = await queryRunner.hasTable('stock_quote');
    if (!stockQuoteTableExists) {
      await queryRunner.query(
        `CREATE TABLE "stock_quote" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date, "open" numeric, "dayHigh" numeric, "dayLow" numeric, "yearLow" numeric, "yearHigh" numeric, "price" numeric, "priceAvg50" numeric, "priceAvg200" numeric, "adjClose" numeric, "volume" integer, "avgVolume" numeric, "change" numeric, "changesPercentage" numeric, "eps" numeric, "pe" numeric, "marketCap" numeric, "previousClose" numeric, "earningsAnnouncement" TIMESTAMP WITH TIME ZONE, "sharesOutstanding" numeric, "timestamp" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "stockId" uuid, CONSTRAINT "PK_fd94eda070b95fde2d06302cf56" PRIMARY KEY ("id"))`,
      );
    }

    // Check if stock table exists before creating
    const stockTableExists = await queryRunner.hasTable('stock');
    if (!stockTableExists) {
      await queryRunner.query(
        `CREATE TABLE "stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticker" character varying NOT NULL, "name" character varying NOT NULL, "exchange" character varying, "lastUpdated" TIMESTAMP, "companyId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5602443b4cca67e34f828c4632" UNIQUE ("ticker"), CONSTRAINT "REL_ae5da2f38f2ce30acf72ec3270" UNIQUE ("companyId"), CONSTRAINT "PK_092bc1fc7d860426a1dec5aa8e9" PRIMARY KEY ("id"))`,
      );
    }

    // Check if user_role_enum type exists
    const userRoleEnumExists = await queryRunner
      .query(
        `
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'user_role_enum'
      );
    `,
      )
      .then((result) => result[0].exists);

    if (!userRoleEnumExists) {
      await queryRunner.query(
        `CREATE TYPE "public"."user_role_enum" AS ENUM('BASIC_USER', 'ADMIN')`,
      );
    }

    // Check if user table exists before creating
    const userTableExists = await queryRunner.hasTable('user');
    if (!userTableExists) {
      await queryRunner.query(
        `CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying, "lastName" character varying, "email" character varying NOT NULL, "provider" character varying, "password" character varying, "isActive" boolean NOT NULL DEFAULT true, "accessToken" character varying, "refreshToken" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'BASIC_USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
      );
    }

    // Check if watchlist table exists before creating
    const watchlistTableExists = await queryRunner.hasTable('watchlist');
    if (!watchlistTableExists) {
      await queryRunner.query(
        `CREATE TABLE "watchlist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "stockId" uuid, CONSTRAINT "PK_0c8c0dbcc8d379117138e71ad5b" PRIMARY KEY ("id"))`,
      );
    }

    // Check if document table exists before creating
    const documentTableExists = await queryRunner.hasTable('document');
    if (!documentTableExists) {
      await queryRunner.query(
        `CREATE TABLE "document" ("id" SERIAL NOT NULL, "type" character varying, "category" character varying, "date" date, "embedding" vector, "text" text, "ticker" character varying, "source" character varying, "reliabilityScore" double precision DEFAULT '1', "contentDate" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_9b3b8204da71b08c6c21e00f65" ON "document" ("ticker") `,
      );
    }

    // Add foreign key constraints conditionally
    // First check if the constraints don't already exist

    // Check and create stock_statistic to stock_quote foreign key
    const statisticToQuoteFK = await this.constraintExists(
      queryRunner,
      'stock_statistic',
      'FK_9fe7aaf8772622f16625687d077',
    );
    if (!statisticToQuoteFK) {
      await queryRunner.query(
        `ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_9fe7aaf8772622f16625687d077" FOREIGN KEY ("quoteId") REFERENCES "stock_quote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    // Check and create stock_statistic to stock foreign key
    const statisticToStockFK = await this.constraintExists(
      queryRunner,
      'stock_statistic',
      'FK_8fe2093a9d947e9d6c367d27658',
    );
    if (!statisticToStockFK) {
      await queryRunner.query(
        `ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_8fe2093a9d947e9d6c367d27658" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Check and create stock_quote to stock foreign key
    const quoteToStockFK = await this.constraintExists(
      queryRunner,
      'stock_quote',
      'FK_d716b29e9d19f39c4d0adfe09d4',
    );
    if (!quoteToStockFK) {
      await queryRunner.query(
        `ALTER TABLE "stock_quote" ADD CONSTRAINT "FK_d716b29e9d19f39c4d0adfe09d4" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Check and create stock to company foreign key
    const stockToCompanyFK = await this.constraintExists(
      queryRunner,
      'stock',
      'FK_ae5da2f38f2ce30acf72ec3270e',
    );
    if (!stockToCompanyFK) {
      await queryRunner.query(
        `ALTER TABLE "stock" ADD CONSTRAINT "FK_ae5da2f38f2ce30acf72ec3270e" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    // Check and create watchlist to user foreign key
    const watchlistToUserFK = await this.constraintExists(
      queryRunner,
      'watchlist',
      'FK_03878f3f177c680cc195900f80a',
    );
    if (!watchlistToUserFK) {
      await queryRunner.query(
        `ALTER TABLE "watchlist" ADD CONSTRAINT "FK_03878f3f177c680cc195900f80a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Check and create watchlist to stock foreign key
    const watchlistToStockFK = await this.constraintExists(
      queryRunner,
      'watchlist',
      'FK_8cd0beadb4dd6c116ce8f917415',
    );
    if (!watchlistToStockFK) {
      await queryRunner.query(
        `ALTER TABLE "watchlist" ADD CONSTRAINT "FK_8cd0beadb4dd6c116ce8f917415" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  // Helper method to check if a constraint exists
  private async constraintExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = '${constraintName}'
        AND n.nspname = 'public'
      );
    `);

    return result[0].exists;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector;`);

    // Drop constraints if they exist
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "watchlist" DROP CONSTRAINT IF EXISTS "FK_8cd0beadb4dd6c116ce8f917415"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "watchlist" DROP CONSTRAINT IF EXISTS "FK_03878f3f177c680cc195900f80a"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "stock" DROP CONSTRAINT IF EXISTS "FK_ae5da2f38f2ce30acf72ec3270e"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "stock_quote" DROP CONSTRAINT IF EXISTS "FK_d716b29e9d19f39c4d0adfe09d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "stock_statistic" DROP CONSTRAINT IF EXISTS "FK_8fe2093a9d947e9d6c367d27658"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "stock_statistic" DROP CONSTRAINT IF EXISTS "FK_9fe7aaf8772622f16625687d077"`,
    );

    // Drop index if it exists
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9b3b8204da71b08c6c21e00f65"`,
    );

    // Drop tables if they exist
    await queryRunner.query(`DROP TABLE IF EXISTS "document"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "watchlist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);

    // Drop type if it exists
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_quote"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_statistic"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company"`);
  }
}
