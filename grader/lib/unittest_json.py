#!/usr/bin/env python3
"""
Run named unittest tests and write a machine-readable result.

    unittest_json.py <out.json> <module:Class:test> [<module:Class:test> ...]

Exists because unittest has no JSON output and because the obvious way to drive
it from a notebook is wrong in a way that silently passes everything:

    def run(test):                      # helper.py, in every pb-* repo
        suite = TestSuite()
        suite.addTest(test)
        TextTestRunner().run(suite)     # <- result discarded

`TextTestRunner.run` returns the result rather than raising, so a failing
assertion prints "FAILED (errors=1)" and the cell completes. `jupyter nbconvert
--execute` then exits 0 and the student passes without writing a line of code.

Import errors are results too, not crashes: a student whose module does not even
parse should see that as a failed test, not as a grader that fell over.

Run from the directory holding the student's modules, so `import op` resolves to
their work.
"""

import importlib
import json
import sys
import time
import traceback
import unittest


def load(spec):
    """Resolve `module:Class:test` against the student's code."""
    module_name, class_name, test_name = spec.split(':')
    module = importlib.import_module(module_name)
    # The notebooks reload modules between cells; do the same so a stale
    # bytecode cache cannot decide a grade.
    module = importlib.reload(module)
    return getattr(module, class_name)(test_name)


def main(argv):
    if len(argv) < 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    destination, specs = argv[1], argv[2:]
    sys.path.insert(0, '.')

    results = []
    for spec in specs:
        started = time.monotonic()
        try:
            test = load(spec)
        except Exception:
            results.append(
                {
                    'name': spec,
                    'status': 'failed',
                    'message': f'Could not load this test:\n{traceback.format_exc()}',
                    'durationMs': round((time.monotonic() - started) * 1000),
                }
            )
            continue

        suite = unittest.TestSuite()
        suite.addTest(test)
        # Buffer stdout/stderr: these exercises print a lot, and that output
        # belongs in the failure message rather than interleaved in the job log.
        outcome = unittest.TextTestRunner(
            stream=sys.stderr, verbosity=2, buffer=True
        ).run(suite)
        duration_ms = round((time.monotonic() - started) * 1000)

        problems = outcome.errors + outcome.failures
        if problems:
            results.append(
                {
                    'name': spec,
                    'status': 'failed',
                    'message': problems[0][1],
                    'durationMs': duration_ms,
                }
            )
        elif outcome.skipped:
            results.append(
                {
                    'name': spec,
                    'status': 'skipped',
                    'message': outcome.skipped[0][1],
                    'durationMs': duration_ms,
                }
            )
        else:
            results.append(
                {'name': spec, 'status': 'passed', 'durationMs': duration_ms}
            )

    with open(destination, 'w') as handle:
        json.dump({'results': results}, handle, indent=2)

    return 0 if all(r['status'] != 'failed' for r in results) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
