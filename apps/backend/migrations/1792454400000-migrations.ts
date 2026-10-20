import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1792454400000 implements MigrationInterface {
    name = 'Migrations1792454400000';

    /**
     * Moves the live LBTCL and BPD cohorts off GitHub Classroom and onto the
     * in-house classroom.
     *
     * Their configs already say INHOUSE, but that is only read when a cohort is
     * created, so cohorts created before the in-house deploy are still on
     * CLASSROOM. Students resubmit every week in-house, so nothing Classroom
     * recorded is kept: exercise scores start again from zero.
     *
     * Clearing `classroomId` is what stops the six-hourly Classroom sync, which
     * returns early, without rescheduling, for a cohort that has none. The
     * cohorts end up exactly like ones created in-house.
     *
     * The assignments themselves are seeded afterwards with
     * `POST /admin/cohorts/:cohortId/sync-assignments`. That reads the cohort
     * config, which a migration cannot.
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Not yet past the end of graduation day in IST (18:29:59.999 UTC),
        // the same cut-off the assignment deadlines use.
        const cohorts: { id: string }[] = await queryRunner.query(`
            SELECT c."id"
            FROM "cohort" c
            JOIN "cohort_week" g
              ON g."cohortId" = c."id" AND g."type" = 'GRADUATION'
            WHERE c."type" IN (
                    'LEARNING_BITCOIN_FROM_COMMAND_LINE',
                    'BITCOIN_PROTOCOL_DEVELOPMENT'
                )
              AND c."assignmentBackend" = 'CLASSROOM'
              AND g."scheduledDate" + interval '18 hours 29 minutes 59.999 seconds' > now()
        `);
        if (cohorts.length === 0) return;
        const ids = cohorts.map((c) => c.id);

        await queryRunner.query(
            `
            UPDATE "cohort"
            SET "assignmentBackend" = 'INHOUSE',
                "classroomId" = NULL,
                "updatedAt" = now()
            WHERE "id" = ANY($1)
        `,
            [ids],
        );

        await queryRunner.query(
            `
            UPDATE "cohort_week"
            SET "classroomAssignmentId" = NULL,
                "classroomInviteLink" = NULL,
                "classroomAssignmentUrl" = NULL,
                "updatedAt" = now()
            WHERE "cohortId" = ANY($1)
        `,
            [ids],
        );

        await queryRunner.query(
            `
            UPDATE "exercise_score"
            SET "isSubmitted" = false,
                "isPassing" = false,
                "classroomRepositoryUrl" = NULL,
                "updatedAt" = now()
            WHERE "cohortId" = ANY($1)
        `,
            [ids],
        );

        // The sync would stop by itself on its next run; cancelling the queued
        // ones just ends it now.
        await queryRunner.query(
            `
            UPDATE "api_task"
            SET "status" = 'CANCELLED',
                "updatedAt" = now()
            WHERE "type" = 'SYNC_CLASSROOM_SCORES'
              AND "status" IN ('UNPROCESSED', 'FAILED')
              AND "data"->>'cohortId' = ANY($1)
        `,
            [ids],
        );
    }

    /**
     * Nothing to restore: the Classroom scores are discarded on purpose, and a
     * moved cohort is indistinguishable from one created in-house. The recovery
     * point is the database snapshot taken before deploying.
     */
    public async down(): Promise<void> {
        // no-op
    }
}
