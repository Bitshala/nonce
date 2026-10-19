# Switching a cohort from GitHub Classroom to the in-house classroom

This switch moves a **live** cohort's exercises off GitHub Classroom. It is **one-way**. Going back would orphan the provisioned repos and the in-house submissions, so the API has no endpoint for it. Every step below exists because this operation changes how a cohort's scores are derived, and students cannot see why a score moved.

## What the switch does

`POST /admin/cohorts/:id/switch-to-inhouse`, ADMIN only. In the UI it is under **Cohort Selection → ⋯ → Switch to in-house classroom…**.

1. **Refuses** if anything would make it fail or do harm:
   - the cohort has graduated;
   - it has no Classroom id;
   - an exercise week has no `assignment` block in the cohort config;
   - an assignment would open already past its deadline.

   `GET …/switch-to-inhouse/preview` lists every refusal without writing anything, and the dialog shows them.
2. **Reads GitHub Classroom one last time**, outside the transaction. If any week cannot be read, the switch returns **502 and changes nothing**.
3. Runs one transaction, under a lock on the cohort row. The periodic Classroom sync takes the same lock before it writes, so a sync that was already running cannot write after the switch. Inside that transaction it:
   - writes that final read onto `exercise_score`;
   - freezes every row of the cohort into `classroom_result_snapshot`;
   - flips `assignmentBackend` to `INHOUSE` and records `switchedFromClassroomAt` and `switchedFromClassroomById`;
   - cancels the queued Classroom syncs;
   - seeds a `PUBLISHED` assignment for every exercise week, past weeks included;
   - queues `SEND_CLASSROOM_SWITCH_EMAILS`.

From then on, writeback derives each score as:

```
pin ?? (in-house result || frozen Classroom result)
```

A Classroom pass can only be lowered by an explicit staff pin. Clearing the pin brings the pass back. Removing a student and adding them back restores their Classroom results from the snapshot.

## Before the day

- [ ] The cohort's config has an `assignment` block on every exercise week, and the preview shows no blockers.
- [ ] No cohort is in the ambiguous state the old heuristic would have misread. This must return **0 rows**:

  ```sql
  SELECT id, type, season FROM cohort
  WHERE "assignmentBackend" = 'INHOUSE'
    AND "classroomId" IS NOT NULL
    AND "switchedFromClassroomAt" IS NULL;
  ```
- [ ] The grader and template repos for every week exist in the GitHub App's org. Do one test accept-and-run with a staff account.
- [ ] Announce it on the cohort's Discord at least a day ahead. The bot cannot post messages, so do this by hand. Suggested text:
  > On <date>, exercises move from GitHub Classroom to the Bitshala classroom (Assignments in the portal). Anything you push to GitHub Classroom after that won't be graded. Results GitHub Classroom has already recorded are kept, and nothing on the new classroom can lower them.

## On the day

1. **Snapshot the database.** This is the recovery point:
   ```bash
   npm run db:snapshot   # with DB_POSTGRES_* pointing at the target database
   ```
2. **Open the dialog and read the preview.** Check the student count, the current week, the assignments it will open with their due dates, and the last Classroom sync.
3. **Type the cohort's name, then click Switch permanently.**
   - **502:** GitHub Classroom could not be read and nothing changed. Retry in a few minutes.
   - **409 "already on the in-house classroom":** someone else switched it. Go to Verify.
4. **Verify.** In `psql`, set the cohort first: `\set cohort '<cohort-uuid>'`.

   The freeze matches the scores. Right after the switch this must return **0 rows**:
   ```sql
   SELECT es."userId", es."cohortWeekId"
   FROM exercise_score es
   LEFT JOIN classroom_result_snapshot s
     ON s."userId" = es."userId" AND s."cohortWeekId" = es."cohortWeekId"
   WHERE es."cohortId" = :'cohort'
     AND (s.id IS NULL
       OR es."isSubmitted" IS DISTINCT FROM s."isSubmitted"
       OR es."isPassing"   IS DISTINCT FROM s."isPassing");
   ```

   The switch is on record:
   ```sql
   SELECT "assignmentBackend", "switchedFromClassroomAt", "switchedFromClassroomById"
   FROM cohort WHERE id = :'cohort';
   ```

   The student email went out. Expect `PROCESSED`; per-user send failures are in the backend log:
   ```sql
   SELECT status, "updatedAt", "lastExecutionFailureDetails" FROM api_task
   WHERE type = 'SEND_CLASSROOM_SWITCH_EMAILS' AND data->>'cohortId' = :'cohort';
   ```
5. **Spot-check as a student.** Use a student who passed a week on Classroom (impersonate, or ask one). On their Assignments page that week reads **Passed on GitHub Classroom**, it is counted as done and it is skipped by Up next. The notice banner shows on that page and on the cohort's instructions.

## Afterwards, at any time

No Classroom pass may be lost without a staff pin. This must always return **0 rows**. Any row is a score that dropped below its frozen Classroom result with no pin to explain it:

```sql
SELECT es."userId", w.week, s."isPassing" AS classroom_passing, es."isPassing" AS score_passing
FROM classroom_result_snapshot s
JOIN exercise_score es ON es."userId" = s."userId" AND es."cohortWeekId" = s."cohortWeekId"
JOIN cohort_week w ON w.id = s."cohortWeekId"
LEFT JOIN assignment a ON a."cohortWeekId" = s."cohortWeekId"
LEFT JOIN assignment_submission sub ON sub."assignmentId" = a.id AND sub."userId" = s."userId"
WHERE s."cohortId" = :'cohort'
  AND ((s."isPassing"   AND NOT es."isPassing"   AND sub."isPassingOverride"   IS DISTINCT FROM false)
    OR (s."isSubmitted" AND NOT es."isSubmitted" AND sub."isSubmittedOverride" IS DISTINCT FROM false));
```

Run it before generating certificates.

## If it went wrong

There is no undo endpoint, by design. The recovery path is restoring the snapshot from step 1. That also discards every in-house submission, run and score change made since. Stop and agree on it with whoever owns the cohort before doing it. `classroom_result_snapshot` is never updated after the switch, so it remains the record of what Classroom reported, even if scores are later edited by hand.

## Rehearsal on a sandbox (required before the first production switch)

Run this once end to end before switching any production cohort. **Never use `apps/backend/config/dev.config.yaml`'s credentials against real cohorts.** Use a sandbox database and a test GitHub org and classroom.

1. Restore a recent production snapshot into the local Docker database (`npm run db:restore -- <file>`). Point one active Classroom cohort at the test classroom: set `cohort."classroomId"` and each week's `"classroomAssignmentId"` to the test assignments. Point `github.token` and `githubApp.*` at the test org.
2. In the test classroom, have a test student push a passing solution to one week **after** the last periodic sync. This is the work that used to be lost.
3. Save the scores to compare against:
   ```bash
   docker exec bitshala-db psql -U root -d bitshala -c "\copy (SELECT \"userId\", \"cohortWeekId\", \"isSubmitted\", \"isPassing\" FROM exercise_score WHERE \"cohortId\" = '<id>' ORDER BY 1, 2) TO STDOUT CSV" > before.csv
   ```
4. Switch from the UI. Run the same `\copy` into `after.csv`, then `diff before.csv after.csv`. The **only** difference should be the test student's late pass, which the final read picked up. Then run the freeze query from Verify; expect 0 rows.
5. As that student, go through the following, and run the "Afterwards" query after each step (expect 0 rows):
   - save without passing (the Classroom pass stays);
   - pass in-house (it stays passed);
   - pin fail, then clear the pin (it returns to passed);
   - remove the student and add them back (the Classroom results return).
6. Attach `before.csv` / `after.csv`, the diff and the query outputs to the PR.
