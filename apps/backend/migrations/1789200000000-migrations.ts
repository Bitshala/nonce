import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1789200000000 implements MigrationInterface {
    name = 'Migrations1789200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."assignment_deadlinesource_enum" AS ENUM('NONE', 'GRADUATION', 'WEEK_OFFSET')`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment" ADD "deadlineSource" "public"."assignment_deadlinesource_enum" NOT NULL DEFAULT 'NONE'`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment" ADD "deadlineDaysAfterWeek" integer`,
        );
        // Existing rows carry a date but no rule, and a reschedule now derives
        // the date from the rule — so leaving them at NONE would clear their
        // deadline the first time a cohort moved. Before this, a deadline could
        // only have come from an offset against its own week, so reconstruct
        // that offset from the two dates rather than just setting the enum.
        //
        // `deadline` is stored as end-of-day IST and `scheduledDate` as UTC
        // midnight, so each is read back in the zone it was written in.
        await queryRunner.query(`
            UPDATE "assignment" a
            SET "deadlineSource" = 'WEEK_OFFSET',
                "deadlineDaysAfterWeek" =
                    (a."deadline" AT TIME ZONE 'Asia/Kolkata')::date
                    - (w."scheduledDate" AT TIME ZONE 'UTC')::date
            FROM "cohort_week" w
            WHERE w."id" = a."cohortWeekId" AND a."deadline" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "assignment" DROP COLUMN "deadlineDaysAfterWeek"`,
        );
        await queryRunner.query(
            `ALTER TABLE "assignment" DROP COLUMN "deadlineSource"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."assignment_deadlinesource_enum"`,
        );
    }
}
