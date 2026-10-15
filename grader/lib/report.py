#!/usr/bin/env python3
"""
Writers for report.json, the contract in ../report.schema.json.

Every grade.sh ends by turning its runner's output into a report. Doing that by
hand in bash is where graders go wrong — a missing field or a stray status value
is only discovered when a student's run comes back blank — so the translations
live here and each grade.sh calls one of them.

    report.py from-jest    <jest-json>     <report.json>
    report.py from-unittest <runner-json>  <report.json>
    report.py single       <report.json> <passed|failed> <name> [message]
    report.py merge        <report.json> <part.json> [part.json ...]

`single` is for the cases that are genuinely one bit — a build that did not
compile, an output file the student never produced. Prefer the others: the
per-test list is what the UI renders as a checklist.
"""

import json
import os
import re
import sys

SCHEMA_VERSION = 1

# Keep messages well inside the column the backend stores them in, and stop one
# runaway stack trace from crowding out every other result in the UI.
MAX_MESSAGE_CHARS = 4000

# Jest colourises failure messages even under --json, and the escapes survive
# into the report and then into the browser as literal garbage.
ANSI = re.compile(r'\x1b\[[0-9;]*[A-Za-z]')


def clean(message):
    if not message:
        return None
    text = ANSI.sub('', message).strip()
    if len(text) > MAX_MESSAGE_CHARS:
        text = text[:MAX_MESSAGE_CHARS] + '\n... (truncated)'
    return text or None


def relative(path):
    """
    Trim the runner's workspace off a file name. Jest reports absolute paths,
    and `/home/runner/work/grade/grade/student/test/test.spec.ts` in a student's
    result list is noise wrapped around the four characters that matter.
    """
    root = os.environ.get('STUDENT_DIR')
    if not root:
        return path
    try:
        # realpath both sides: the runner hands out one spelling of the
        # workspace and jest reports another whenever a symlink sits between
        # them, and a relpath across those two is worse than no relpath at all.
        trimmed = os.path.relpath(os.path.realpath(path), os.path.realpath(root))
    except ValueError:
        return path
    # Escaping the student directory means the guess was wrong.
    return path if trimmed.startswith('..') else trimmed


def write(path, passed, tests):
    report = {
        'schemaVersion': SCHEMA_VERSION,
        'passed': bool(passed),
        'tests': tests,
    }
    with open(path, 'w') as handle:
        json.dump(report, handle, indent=2)
    # The log is the only place a TA can see why a run scored what it did
    # without pulling the artifact down.
    failed = [t for t in tests if t['status'] == 'failed']
    print(
        f"report: {'PASS' if passed else 'FAIL'} "
        f"({len(tests) - len(failed)}/{len(tests)} passed)"
    )
    for test in failed:
        print(f"  FAILED  {test['name']}")


def add(tests, name, status, message=None, duration_ms=None):
    test = {'name': name, 'status': status}
    if message is not None:
        cleaned = clean(message)
        if cleaned:
            test['message'] = cleaned
    if duration_ms is not None:
        test['durationMs'] = max(0, duration_ms)
    tests.append(test)


def from_jest(source, destination):
    """
    Translate `jest --json --outputFile`.

    Jest reports a suite that failed to even load (a TypeScript error, a missing
    module) as a testResult with no assertionResults and a top-level message. If
    that is dropped the report comes back empty and passing, which is the worst
    possible failure mode, so it is surfaced as a failed entry instead.
    """
    with open(source) as handle:
        data = json.load(handle)

    tests = []
    for suite in data.get('testResults', []):
        assertions = suite.get('assertionResults', [])
        if not assertions:
            add(
                tests,
                f'{relative(suite.get("name", "test suite"))} (suite failed to run)',
                'failed',
                suite.get('message') or 'The suite produced no results.',
            )
            continue

        for assertion in assertions:
            status = assertion.get('status')
            add(
                tests,
                assertion.get('fullName') or assertion.get('title') or 'test',
                # Jest's `pending`/`todo`/`disabled` all mean "did not run".
                {'passed': 'passed', 'failed': 'failed'}.get(status, 'skipped'),
                '\n'.join(assertion.get('failureMessages') or []),
                assertion.get('duration'),
            )

    # Trust jest's own verdict over a recount: a suite-level crash can leave the
    # per-assertion list looking clean.
    passed = bool(data.get('success')) and any(
        t['status'] == 'passed' for t in tests
    )
    write(destination, passed, tests)


def from_unittest(source, destination):
    """
    Translate the JSON written by lib/unittest_json.py.

    Python's unittest has no machine-readable output of its own, which is the
    root of the bug this replaces: `TextTestRunner().run(suite)` returns a
    result object that the programming-bitcoin notebooks discard, so a failing
    exercise still exits 0. The runner here reports explicitly.
    """
    with open(source) as handle:
        data = json.load(handle)

    tests = []
    for result in data.get('results', []):
        add(
            tests,
            result['name'],
            result['status'],
            result.get('message'),
            result.get('durationMs'),
        )

    passed = bool(tests) and all(t['status'] != 'failed' for t in tests)
    write(destination, passed, tests)


def single(destination, verdict, name, message=None):
    status = 'passed' if verdict == 'passed' else 'failed'
    tests = []
    add(tests, name, status, message)
    write(destination, status == 'passed', tests)


def merge(destination, parts):
    """
    Combine several runners into one report. Used by the assignments that grade
    in stages — bitcoin-protocol-development week 3 runs four separate suites —
    where one report per stage would lose everything but the last.
    """
    tests = []
    for part in parts:
        with open(part) as handle:
            tests.extend(json.load(handle).get('tests', []))

    passed = bool(tests) and all(t['status'] != 'failed' for t in tests)
    write(destination, passed, tests)


def main(argv):
    if len(argv) < 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    command = argv[1]
    # The translating commands read argv[2] and write argv[3]; the rest write
    # argv[2]. Worth being explicit about: getting it wrong sends the fallback
    # report below to the input file and leaves report.json absent, which is
    # exactly the case the fallback exists to prevent.
    destination = argv[3] if command.startswith('from-') else argv[2]

    try:
        if command == 'from-jest':
            from_jest(argv[2], destination)
        elif command == 'from-unittest':
            from_unittest(argv[2], destination)
        elif command == 'single':
            single(destination, argv[3], argv[4], argv[5] if len(argv) > 5 else None)
        elif command == 'merge':
            merge(destination, argv[3:])
        else:
            print(f'Unknown command: {command}', file=sys.stderr)
            return 2
    except (OSError, json.JSONDecodeError, KeyError, IndexError) as error:
        # A grader that cannot even write its report must not leave the file
        # absent — run-tests.sh would report "no report" and hide the real
        # cause, which is almost always a runner that crashed before writing.
        print(f'report.py {command} failed: {error}', file=sys.stderr)
        try:
            single(
                destination,
                'failed',
                'grader',
                f'Could not build the report: {error}',
            )
        except OSError:
            return 1
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
