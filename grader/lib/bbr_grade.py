"""Run and report the standalone Rust integration suite for one BBR week."""

import os
import re
import shutil
import signal
import subprocess
import tempfile
from collections import Counter
from contextlib import suppress
from pathlib import Path

from report import MAX_MESSAGE_CHARS, add, single, write

TIMEOUT_MINUTES = 8
TEST_NAME = r'[\w:]+'
RUNNING = re.compile(r'^running (\d+) tests?$', re.M)
RESULT = re.compile(rf'^test ({TEST_NAME}) \.\.\. (ok|FAILED|ignored)(?:, .*)?$', re.M)
SLOW = re.compile(rf'^test ({TEST_NAME}) has been running for over \d+ seconds$', re.M)
SUMMARY = re.compile(
    r'(ok|FAILED)\. (\d+) passed; (\d+) failed; '
    r'(\d+) ignored; 0 measured; 0 filtered out(?:; .*)?'
)
FAILURE_HEADER = re.compile(rf'^---- ({TEST_NAME}) stdout ----$', re.M)
STATUSES = {'ok': 'passed', 'FAILED': 'failed', 'ignored': 'skipped'}


def run_cargo(crate):
    command = [
        'cargo', 'test', '--locked', '--color', 'never', '--test', 'assignment_tests',
        '--', '--format', 'pretty', '--color', 'never',
    ]
    # Capture output in the grader process. A separate process group lets the
    # timeout stop both Cargo and the test process it starts.
    with subprocess.Popen(
        command, cwd=crate, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        encoding='utf-8', errors='replace', start_new_session=True,
    ) as cargo:
        timed_out = False
        try:
            output, _ = cargo.communicate(timeout=TIMEOUT_MINUTES * 60)
        except subprocess.TimeoutExpired:
            timed_out = True
            with suppress(ProcessLookupError):
                os.killpg(cargo.pid, signal.SIGKILL)
            output, _ = cargo.communicate()

        return output, cargo.returncode, timed_out


def report_results(destination, output, cargo_status, timed_out, expected):
    # Panic output follows the test progress and precedes the final summary.
    body, marker, summary_tail = output.rpartition('\ntest result: ')
    summary = SUMMARY.fullmatch(summary_tail.partition('\n')[0]) if marker else None
    progress, _, failures = (body if marker else output).partition('\nfailures:\n')
    running = RUNNING.search(progress)
    progress = progress[running.end():] if running else ''
    results = RESULT.findall(progress)
    reported = {name for name, _ in results}
    counts = Counter(status for _, status in results)
    result_counts = (counts['ok'], counts['FAILED'], counts['ignored'])
    verdict = 'FAILED' if counts['FAILED'] else 'ok'
    complete = (
        running is not None and bool(expected)
        and len(results) == int(running[1]) == len(expected)
        and reported == expected
        and summary is not None and summary[1] == verdict
        and tuple(map(int, summary.groups()[1:])) == result_counts
    )

    details, _, _ = failures.rpartition('\nfailures:\n')
    sections = FAILURE_HEADER.split(details)
    messages = dict(zip(sections[1::2], sections[2::2]))
    tests = []
    for name, status in dict(results).items():
        if name in expected:
            add(tests, name, STATUSES[status], messages.get(name))

    if timed_out:
        hanging = sorted((set(SLOW.findall(progress)) & expected) - reported)
        message = f'The Rust test run exceeded the {TIMEOUT_MINUTES}-minute limit.'
        for name in hanging or ['Cargo tests timed out']:
            add(tests, name, 'failed', message)
    elif cargo_status and (not complete or not counts['FAILED']):
        add(tests, 'Cargo tests ran', 'failed', output[-MAX_MESSAGE_CHARS:])
    elif not complete:
        add(tests, 'Every test reported a result', 'failed',
            'The test run did not report a complete set of results.')

    passed = not timed_out and cargo_status == 0 and complete and not counts['FAILED']
    write(destination, passed, tests)


def main():
    suite = Path(os.environ['TEST_DIR'])
    source = Path(os.environ['STUDENT_DIR']) / 'src'
    destination = os.environ['REPORT_PATH']
    if not source.is_dir():
        single(destination, 'failed', 'Rust source directory exists',
               'Restore src/ from the starter repository and run again.')
        return

    expected = set((suite / 'test-names.txt').read_text().splitlines())
    with tempfile.TemporaryDirectory(prefix='grade-bbr-') as work:
        crate = Path(work) / 'crate'
        shutil.copytree(suite / 'crate', crate)
        shutil.copytree(source, crate / 'src', symlinks=True)
        output, status, timed_out = run_cargo(crate)

    print(output, end='')
    report_results(destination, output, status, timed_out, expected)


if __name__ == '__main__':
    main()
