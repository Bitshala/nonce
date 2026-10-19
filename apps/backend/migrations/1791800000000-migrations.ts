import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1791800000000 implements MigrationInterface {
    name = 'Migrations1791800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Empty until a cohort switches: the switch fills it in its own
        // transaction, so there is nothing to backfill.
        await queryRunner.query(
            `CREATE TABLE "classroom_result_snapshot" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isSubmitted" boolean NOT NULL, "isPassing" boolean NOT NULL, "classroomRepositoryUrl" text, "userId" uuid NOT NULL, "cohortId" uuid NOT NULL, "cohortWeekId" uuid NOT NULL, CONSTRAINT "UQ_9c784328f590ab9ed628fac4c8f" UNIQUE ("userId", "cohortWeekId"), CONSTRAINT "PK_f618e100687d53afaf8fc98a35a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_61659971991d9bb80ccb22f007" ON "classroom_result_snapshot" ("cohortId")`,
        );
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" ADD CONSTRAINT "FK_145b2ec8ae94e092af440bf1bfd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" ADD CONSTRAINT "FK_61659971991d9bb80ccb22f0074" FOREIGN KEY ("cohortId") REFERENCES "cohort"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" ADD CONSTRAINT "FK_ea3d9ce65762f826318e89d3205" FOREIGN KEY ("cohortWeekId") REFERENCES "cohort_week"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" DROP CONSTRAINT "FK_ea3d9ce65762f826318e89d3205"`,
        );
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" DROP CONSTRAINT "FK_61659971991d9bb80ccb22f0074"`,
        );
        await queryRunner.query(
            `ALTER TABLE "classroom_result_snapshot" DROP CONSTRAINT "FK_145b2ec8ae94e092af440bf1bfd"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_61659971991d9bb80ccb22f007"`,
        );
        await queryRunner.query(`DROP TABLE "classroom_result_snapshot"`);
    }
}
