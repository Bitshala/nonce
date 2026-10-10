import type { CIRunDetailResponse } from '@nonce/shared';
import { CIRunConclusion, CIRunStatus } from '@nonce/shared';

/** A run that will not change any more. */
export function isTerminal(status: CIRunStatus): boolean {
  return status === CIRunStatus.COMPLETED || status === CIRunStatus.ORPHANED;
}

export function describeRun(run: CIRunDetailResponse): {
  label: string;
  color: 'info.main' | 'success.main' | 'warning.main' | 'error.main';
} {
  if (run.status !== CIRunStatus.COMPLETED) {
    return {
      label: run.status.replace('_', ' ').toLowerCase(),
      color: 'info.main',
    };
  }
  if (run.conclusion === CIRunConclusion.SUCCESS) {
    return { label: 'passed', color: 'success.main' };
  }
  if (run.conclusion === CIRunConclusion.TIMED_OUT) {
    return { label: 'timed out', color: 'warning.main' };
  }
  return { label: 'failed', color: 'error.main' };
}

/** The one line shown in the Output panel header. */
export const describeOutput = (
  run: CIRunDetailResponse | undefined,
  isDispatching: boolean
): string => {
  if (!run) return isDispatching ? 'Dispatching…' : 'No runs yet';
  if (run.status === CIRunStatus.ORPHANED) {
    return 'Lost track of this run — run again';
  }
  const { label } = describeRun(run);
  const tests =
    run.testsPassed !== null && run.testsTotal !== null
      ? ` · ${run.testsPassed}/${run.testsTotal} tests`
      : '';
  return `${label[0].toUpperCase()}${label.slice(1)}${tests}`;
};
