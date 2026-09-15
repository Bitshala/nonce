import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1787668488671 implements MigrationInterface {
    name = 'Migrations1787668488671'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ci_run_log" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "sizeBytes" integer NOT NULL, "truncated" boolean NOT NULL DEFAULT false, "ciRunId" uuid, CONSTRAINT "REL_de4d87ff7d7f19626f88a017d6" UNIQUE ("ciRunId"), CONSTRAINT "PK_56e11096c4af5e598d449696385" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ci_run_status_enum" AS ENUM('DISPATCHING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'ORPHANED')`);
        await queryRunner.query(`CREATE TYPE "public"."ci_run_conclusion_enum" AS ENUM('SUCCESS', 'FAILURE', 'CANCELLED', 'TIMED_OUT', 'STARTUP_FAILURE')`);
        await queryRunner.query(`CREATE TABLE "ci_run" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "commitSha" text NOT NULL, "correlationToken" uuid NOT NULL, "githubRunId" bigint, "githubRunAttempt" integer NOT NULL DEFAULT '1', "status" "public"."ci_run_status_enum" NOT NULL DEFAULT 'DISPATCHING', "conclusion" "public"."ci_run_conclusion_enum", "jobs" jsonb NOT NULL DEFAULT '[]', "report" jsonb, "testsPassed" integer, "testsTotal" integer, "countsForScore" boolean NOT NULL DEFAULT true, "dispatchedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "submissionId" uuid, "triggeredByUserId" uuid, CONSTRAINT "PK_b9d70d75f3b17db064b6c9a252f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0d24c1bf53dfc3894f1db4ebf6" ON "ci_run" ("dispatchedAt") WHERE "status" NOT IN ('COMPLETED', 'ORPHANED')`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e98cdb36e7344155a22e9b280b" ON "ci_run" ("correlationToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_a17a8ad6daf2e56f3e0c105c62" ON "ci_run" ("submissionId") `);
        await queryRunner.query(`CREATE TYPE "public"."assignment_submission_provisionstatus_enum" AS ENUM('PENDING', 'PROVISIONING', 'READY', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "assignment_submission" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "repoOwner" text, "repoName" text, "repoNodeId" text, "defaultBranch" text NOT NULL DEFAULT 'main', "provisionStatus" "public"."assignment_submission_provisionstatus_enum" NOT NULL DEFAULT 'PENDING', "provisionError" text, "acceptedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "initialCommitSha" text, "lastCommitSha" text, "lastCommitAt" TIMESTAMP WITH TIME ZONE, "assignmentId" uuid, "userId" uuid, "bestRunId" uuid, "latestRunId" uuid, CONSTRAINT "UQ_dfa3cac2712feb8af1213d12a2e" UNIQUE ("assignmentId", "userId"), CONSTRAINT "PK_098e58241f975dce9d82c759034" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6e69d4d7fc582490906f802366" ON "assignment_submission" ("assignmentId") `);
        await queryRunner.query(`CREATE TYPE "public"."assignment_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "assignment" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" text NOT NULL, "templateOwner" text NOT NULL, "templateRepo" text NOT NULL, "templateRef" text, "graderWorkflowPath" text NOT NULL, "graderTestPath" text NOT NULL, "status" "public"."assignment_status_enum" NOT NULL DEFAULT 'DRAFT', "deadline" TIMESTAMP WITH TIME ZONE, "allowLateSubmission" boolean NOT NULL DEFAULT true, "protectedPaths" jsonb NOT NULL DEFAULT '[".github/**"]', "maxRunsPerDay" integer NOT NULL DEFAULT '50', "runTimeoutMinutes" integer NOT NULL DEFAULT '10', "cohortWeekId" uuid, CONSTRAINT "REL_ea417fbb5f06197f30144259ad" UNIQUE ("cohortWeekId"), CONSTRAINT "PK_43c2f5a3859f54cedafb270f37e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5a8bb8a57e8fd1bddce85ad038" ON "assignment" ("slug") `);
        await queryRunner.query(`CREATE TYPE "public"."cohort_assignmentbackend_enum" AS ENUM('CLASSROOM', 'INHOUSE')`);
        await queryRunner.query(`ALTER TABLE "cohort" ADD "assignmentBackend" "public"."cohort_assignmentbackend_enum" NOT NULL DEFAULT 'CLASSROOM'`);
        await queryRunner.query(`ALTER TABLE "ci_run_log" ADD CONSTRAINT "FK_de4d87ff7d7f19626f88a017d67" FOREIGN KEY ("ciRunId") REFERENCES "ci_run"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ci_run" ADD CONSTRAINT "FK_a17a8ad6daf2e56f3e0c105c621" FOREIGN KEY ("submissionId") REFERENCES "assignment_submission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ci_run" ADD CONSTRAINT "FK_0818da0b73245bad099e9bbe44e" FOREIGN KEY ("triggeredByUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" ADD CONSTRAINT "FK_6e69d4d7fc582490906f802366c" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" ADD CONSTRAINT "FK_6e22f39c7d59e5e5e36c8ebb106" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" ADD CONSTRAINT "FK_2daa63a8e9c4b8cc330461b131d" FOREIGN KEY ("bestRunId") REFERENCES "ci_run"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" ADD CONSTRAINT "FK_c23caf8c07223662f136a4d6da1" FOREIGN KEY ("latestRunId") REFERENCES "ci_run"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment" ADD CONSTRAINT "FK_ea417fbb5f06197f30144259ad0" FOREIGN KEY ("cohortWeekId") REFERENCES "cohort_week"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assignment" DROP CONSTRAINT "FK_ea417fbb5f06197f30144259ad0"`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" DROP CONSTRAINT "FK_c23caf8c07223662f136a4d6da1"`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" DROP CONSTRAINT "FK_2daa63a8e9c4b8cc330461b131d"`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" DROP CONSTRAINT "FK_6e22f39c7d59e5e5e36c8ebb106"`);
        await queryRunner.query(`ALTER TABLE "assignment_submission" DROP CONSTRAINT "FK_6e69d4d7fc582490906f802366c"`);
        await queryRunner.query(`ALTER TABLE "ci_run" DROP CONSTRAINT "FK_0818da0b73245bad099e9bbe44e"`);
        await queryRunner.query(`ALTER TABLE "ci_run" DROP CONSTRAINT "FK_a17a8ad6daf2e56f3e0c105c621"`);
        await queryRunner.query(`ALTER TABLE "ci_run_log" DROP CONSTRAINT "FK_de4d87ff7d7f19626f88a017d67"`);
        await queryRunner.query(`ALTER TABLE "cohort" DROP COLUMN "assignmentBackend"`);
        await queryRunner.query(`DROP TYPE "public"."cohort_assignmentbackend_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a8bb8a57e8fd1bddce85ad038"`);
        await queryRunner.query(`DROP TABLE "assignment"`);
        await queryRunner.query(`DROP TYPE "public"."assignment_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e69d4d7fc582490906f802366"`);
        await queryRunner.query(`DROP TABLE "assignment_submission"`);
        await queryRunner.query(`DROP TYPE "public"."assignment_submission_provisionstatus_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a17a8ad6daf2e56f3e0c105c62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e98cdb36e7344155a22e9b280b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d24c1bf53dfc3894f1db4ebf6"`);
        await queryRunner.query(`DROP TABLE "ci_run"`);
        await queryRunner.query(`DROP TYPE "public"."ci_run_conclusion_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ci_run_status_enum"`);
        await queryRunner.query(`DROP TABLE "ci_run_log"`);
    }

}
