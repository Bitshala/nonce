import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1791700000000 implements MigrationInterface {
    name = 'Migrations1791700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // No backfill: no cohort has been switched yet. Native in-house
        // cohorts never get a classroomId, so a row that is INHOUSE with one
        // would be a manual edit, and the switch runbook checks for it.
        await queryRunner.query(
            `ALTER TABLE "cohort" ADD "switchedFromClassroomAt" TIMESTAMP WITH TIME ZONE`,
        );
        await queryRunner.query(
            `ALTER TABLE "cohort" ADD "switchedFromClassroomById" uuid`,
        );
        await queryRunner.query(
            `ALTER TABLE "cohort" ADD CONSTRAINT "FK_ee6876408ca05e02a6796103ed4" FOREIGN KEY ("switchedFromClassroomById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "cohort" DROP CONSTRAINT "FK_ee6876408ca05e02a6796103ed4"`,
        );
        await queryRunner.query(
            `ALTER TABLE "cohort" DROP COLUMN "switchedFromClassroomById"`,
        );
        await queryRunner.query(
            `ALTER TABLE "cohort" DROP COLUMN "switchedFromClassroomAt"`,
        );
    }
}
