import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1791608929864 implements MigrationInterface {
    name = 'Migrations1791608929864';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Nullable: no existing row holds a claim, and a PROVISIONING row left
        // over from before this column can only be recovered by a reprovision.
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" ADD "provisionClaim" uuid`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "assignment_submission" DROP COLUMN "provisionClaim"`,
        );
    }
}
