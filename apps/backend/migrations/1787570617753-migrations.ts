import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1787570617753 implements MigrationInterface {
    name = 'Migrations1787570617753';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "IDX_71b3cc96a21f69abd80f4c5aa7" ON "exercise_score" ("cohortId", "cohortWeekId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_31e8730bc74386bb21f2a838cf" ON "attendance" ("cohortId", "userId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7ab48eb636bb1f95df1b491727" ON "attendance" ("cohortWeekId", "userId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_64f6b37244cc628bbb95c2b5a1" ON "cohort_membership" ("cohortId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_8252fe901bced10d7edbc3d43f" ON "group_discussion_score" ("cohortId", "userId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_873e0f62091257ff9430914667" ON "group_discussion_score" ("cohortWeekId", "groupNumber") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_fef0dc4d49315c7f8052c5c129" ON "user" ("discordGlobalName") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a09bffa83e18bd1fc46fc1c60f" ON "user" ("discordUserName") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_065d4d8f3b5adb4a08841eae3c" ON "user" ("name") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_c8d4518ca0e1ee0b6ffd3d856d" ON "api_task" ("lastRetryTime", "updatedAt") WHERE "status" = 'FAILED'`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_b979052946495f18ea3ec33e3e" ON "api_task" ("executeOnTime", "updatedAt") WHERE "status" = 'UNPROCESSED'`,
        );
        await queryRunner.query(
            `ALTER TABLE "exercise_score" ADD CONSTRAINT "UQ_20342f826752fecf97806fad949" UNIQUE ("userId", "cohortId", "cohortWeekId")`,
        );
        await queryRunner.query(
            `ALTER TABLE "group_discussion_score" ADD CONSTRAINT "UQ_fdcd9a44b611cc50bc0b6f8cc00" UNIQUE ("userId", "cohortId", "cohortWeekId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "group_discussion_score" DROP CONSTRAINT "UQ_fdcd9a44b611cc50bc0b6f8cc00"`,
        );
        await queryRunner.query(
            `ALTER TABLE "exercise_score" DROP CONSTRAINT "UQ_20342f826752fecf97806fad949"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_b979052946495f18ea3ec33e3e"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_c8d4518ca0e1ee0b6ffd3d856d"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_065d4d8f3b5adb4a08841eae3c"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_a09bffa83e18bd1fc46fc1c60f"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_fef0dc4d49315c7f8052c5c129"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_873e0f62091257ff9430914667"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_8252fe901bced10d7edbc3d43f"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_64f6b37244cc628bbb95c2b5a1"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_7ab48eb636bb1f95df1b491727"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_31e8730bc74386bb21f2a838cf"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_71b3cc96a21f69abd80f4c5aa7"`,
        );
    }
}
