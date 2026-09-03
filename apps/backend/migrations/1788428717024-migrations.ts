import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1788428717024 implements MigrationInterface {
    name = 'Migrations1788428717024';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "fellowship_application" ADD "submittedAt" TIMESTAMP WITH TIME ZONE`,
        );
        // Backfill: existing applications have no recorded submission time. Copy
        // createdAt for every row that has left DRAFT (i.e. was submitted at
        // least once). Drafts that were never submitted stay null.
        await queryRunner.query(
            `UPDATE "fellowship_application" SET "submittedAt" = "createdAt" WHERE "status" <> 'DRAFT'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "fellowship_application" DROP COLUMN "submittedAt"`,
        );
    }
}
