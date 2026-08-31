import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1788146090074 implements MigrationInterface {
    name = 'Migrations1788146090074';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // The admin user list looks certificates up by user -- to filter on how
        // many distinct courses someone completed, and to label each row. The
        // unique (cohortId, userId) constraint's index leads with cohortId, so it
        // cannot serve those lookups.
        await queryRunner.query(
            `CREATE INDEX "IDX_52422eba9e5b9d779d3e173a25" ON "certificate" ("userId") `,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."IDX_52422eba9e5b9d779d3e173a25"`,
        );
    }
}
