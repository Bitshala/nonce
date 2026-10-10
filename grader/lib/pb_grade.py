#!/usr/bin/env python3
"""
Grade a programming-bitcoin week.

    pb_grade.py <checks.json> <report.json>

Every pb assignment has the same shape: one or more chapter directories, each
with a notebook the student fills in and a set of exercises the notebook runs.
So the driver is shared and the per-week difference is entirely data —
`checks.json`, written by tools/extract-pb-checks.py.

Two things are checked per chapter, and both matter:

- **the exercises**, run from fixtures/ against the student's modules. These are
  the grade. Running them directly rather than through the notebook is what
  makes a failure count: the book's `helper.run()` discards its result, so a
  notebook full of failing tests still executes cleanly.
- **the notebook**, executed top to bottom. Some cells are prose-and-code with
  no unittest attached, and a notebook that raises part-way is worth reporting.
  It cannot pass a student on its own, but it can fail one.
"""

import json
import os
import pathlib
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import report  # noqa: E402

LIB_DIR = pathlib.Path(__file__).resolve().parent

# Generous: chapter 9 parses a lot of blocks, and chapter 10 opens a socket to
# an external testnet node. Still far under the job's own timeout.
NOTEBOOK_TIMEOUT_SECONDS = 300


def run_notebook(chapter_dir):
    """Execute the chapter's notebook; return (status, message)."""
    notebooks = [
        nb for nb in sorted(chapter_dir.glob('*.ipynb'))
        if '.ipynb_checkpoints' not in str(nb)
    ]
    if not notebooks:
        return 'skipped', 'No notebook in this chapter.'

    notebook = notebooks[0]
    completed = subprocess.run(
        [
            'jupyter', 'nbconvert', '--execute', '--to', 'notebook',
            '--stdout',
            f'--ExecutePreprocessor.timeout={NOTEBOOK_TIMEOUT_SECONDS}',
            notebook.name,
        ],
        cwd=chapter_dir,
        capture_output=True,
        text=True,
    )
    if completed.returncode == 0:
        return 'passed', None
    return 'failed', (
        f'A cell in {notebook.name} raised. Every cell has to run top to '
        f'bottom.\n{completed.stderr}'
    )


def run_checks(chapter_dir, specs):
    """Run this chapter's exercises; return the runner's results list."""
    results_path = chapter_dir / 'grader-results.json'
    subprocess.run(
        ['python3', str(LIB_DIR / 'unittest_json.py'), results_path.name, *specs],
        cwd=chapter_dir,
        text=True,
    )
    if not results_path.exists():
        # The runner writes a result even for a module that will not import, so
        # getting here means it died outright — report it rather than silently
        # dropping a chapter's worth of exercises.
        return [
            {
                'name': spec,
                'status': 'failed',
                'message': 'The check runner did not produce a result.',
            }
            for spec in specs
        ]
    return json.loads(results_path.read_text())['results']


def title(spec):
    """
    `grader_checks_op:OpTest:test_op_hash160` -> `op.py OpTest.test_op_hash160`.

    The class has to stay in: chapter 10 runs `test_serialize` from three
    different classes, and without it the student sees the same line three
    times and cannot tell which one failed.
    """
    module, class_name, test = spec.split(':')
    return f"{module.removeprefix('grader_checks_')}.py {class_name}.{test}"


def main(argv):
    if len(argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    checks = json.loads(pathlib.Path(argv[1]).read_text())
    report_path = argv[2]
    student = pathlib.Path(os.environ['STUDENT_DIR'])

    by_chapter = {}
    for check in checks:
        by_chapter.setdefault(check['chapter'], []).append(check['spec'])

    tests = []
    for chapter, specs in by_chapter.items():
        chapter_dir = student / chapter
        if not chapter_dir.is_dir():
            report.add(
                tests, f'{chapter} is present', 'failed',
                f'{chapter}/ is missing from the repository.',
            )
            continue

        print(f'--- {chapter}: {len(specs)} exercise(s) ---')
        for result in run_checks(chapter_dir, specs):
            report.add(
                tests,
                f"{chapter} — {title(result['name'])}",
                result['status'],
                result.get('message'),
                result.get('durationMs'),
            )

        print(f'--- {chapter}: notebook ---')
        status, message = run_notebook(chapter_dir)
        report.add(
            tests, f'{chapter} — notebook runs top to bottom', status, message
        )

    report.write(
        report_path,
        bool(tests) and all(t['status'] != 'failed' for t in tests),
        tests,
    )
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
