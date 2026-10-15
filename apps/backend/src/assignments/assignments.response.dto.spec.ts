import { submissionBucket } from '@nonce/shared/submission-bucket';
import { SubmissionResponseDto } from '@/assignments/assignments.response.dto';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { ProvisionStatus } from '@/common/enum';

describe('SubmissionResponseDto', () => {
    const run = () => ({ id: 'r1', dispatchedAt: new Date() }) as CIRun;

    const submission = (
        overrides: Partial<AssignmentSubmission> = {},
    ): AssignmentSubmission =>
        ({
            id: 's1',
            provisionStatus: ProvisionStatus.READY,
            provisionError: null,
            repoHtmlUrl: null,
            defaultBranch: 'main',
            acceptedAt: new Date('2026-01-01T00:00:00Z'),
            lastCommitSha: null,
            lastCommitAt: null,
            hasStudentCommits: false,
            latestRun: null,
            bestRun: null,
            isPassingOverride: null,
            ...overrides,
        }) as AssignmentSubmission;

    it('carries the staff pass pin, so the student view buckets like the admin view', () => {
        const pinned = new SubmissionResponseDto(
            submission({ isPassingOverride: true }),
            'a1',
        );

        expect(pinned.isPassingOverride).toBe(true);
        expect(submissionBucket(pinned)).toBe('passed');
    });

    it('lets a fail pin win over a passing run', () => {
        const dto = new SubmissionResponseDto(
            submission({
                isPassingOverride: false,
                bestRun: run(),
                latestRun: run(),
            }),
            'a1',
        );

        expect(submissionBucket(dto)).toBe('failing');
    });
});
