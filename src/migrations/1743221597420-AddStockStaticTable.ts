import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockStaticTable1743221597420 implements MigrationInterface {
    name = 'AddStockStaticTable1743221597420'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stock_statistic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "enterpriseValue" numeric, "forwardPE" numeric, "priceToBook" numeric, "enterpriseToRevenue" numeric, "enterpriseToEbitda" numeric, "profitMargins" numeric, "trailingEps" numeric, "sharesOutstanding" numeric, "floatShares" numeric, "heldPercentInsiders" numeric, "heldPercentInstitutions" numeric, "sharesShort" numeric, "shortRatio" numeric, "shortPercentOfFloat" numeric, "pegRatio" numeric, "week_change_52" numeric, "sp_week_change_52" numeric, "lastFiscalYearEnd" date, "mostRecentQuarter" date, "quoteId" uuid, "stockId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9fe7aaf8772622f16625687d07" UNIQUE ("quoteId"), CONSTRAINT "PK_77da764cbb376e03b9e83380ba5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_9fe7aaf8772622f16625687d077" FOREIGN KEY ("quoteId") REFERENCES "stock_quote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_statistic" ADD CONSTRAINT "FK_8fe2093a9d947e9d6c367d27658" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_statistic" DROP CONSTRAINT "FK_8fe2093a9d947e9d6c367d27658"`);
        await queryRunner.query(`ALTER TABLE "stock_statistic" DROP CONSTRAINT "FK_9fe7aaf8772622f16625687d077"`);
        await queryRunner.query(`DROP TABLE "stock_statistic"`);
    }

}
