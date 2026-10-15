import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1790441129309 implements MigrationInterface {
    name = 'Migrations1790441129309';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Nullable with no default: null is "no pin", which is every existing
        // submission.
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" ADD "isSubmittedOverride" boolean`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" ADD "isPassingOverride" boolean`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" DROP COLUMN "isPassingOverride"`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" DROP COLUMN "isSubmittedOverride"`,
        );
    }
}
