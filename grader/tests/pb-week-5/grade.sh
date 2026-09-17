#!/usr/bin/env bash
#
# programming-bitcoin, week 5 (Jupyter chapter 8).
#
# This one replaces a grader that passed everything. The template's test.sh is:
#
#     pip3 install -r ./requirements.txt
#     jupyter nbconvert --execute ./chapter-8/Chapter8.ipynb --to python
#     python3 chapter-8/Chapter8.py
#
# and the notebook's assertions run through helper.py's `run()`, which calls
# `TextTestRunner().run(suite)` and throws the result away. A failing test
# prints "FAILED (errors=1)" and the cell completes, so nbconvert exits 0 and an
# untouched repository scores full marks.
#
# So the exercises are graded directly, out of fixtures/, against the student's
# modules. The notebook still runs — it is where exercise 4 lives, which has no
# unittest of its own, and a notebook that raises is worth reporting — but it no
# longer decides the grade on its own.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

# Puts chapter-8/grader_checks.py in place. The book's own test classes sit in
# op.py, helper.py and tx.py — the same files the student edits — so they cannot
# be the ones that count.
restore_fixtures

cd "$STUDENT_DIR"

echo '--- Installing dependencies ---'
if ! python3 -m pip install --quiet --disable-pip-version-check -r requirements.txt; then
    fail_early 'dependencies installed' \
        'pip install failed. This is a fault in the assignment template, not your solution — please report it.'
fi

cd chapter-8

echo '--- Running the notebook ---'
# Exercise 4 has no unittest attached, and a notebook that raises part-way
# through is a real failure worth showing. Captured rather than fatal: the
# exercise checks below are the verdict, and a broken cell after the last
# exercise should not erase four passing ones.
notebook_status=passed
notebook_message=''
if ! notebook_log=$(jupyter nbconvert --execute --to notebook --stdout \
    --ExecutePreprocessor.timeout=180 Chapter8.ipynb 2>&1 >/dev/null); then
    notebook_status=failed
    notebook_message="A cell in Chapter8.ipynb raised. Every cell has to run top to bottom.
${notebook_log}"
fi

echo '--- Checking the exercises ---'
# Reports per exercise, and reports a failure as a failure.
python3 "${LIB_DIR}/unittest_json.py" "${STUDENT_DIR}/unittest-results.json" \
    grader_checks:Exercise1CheckMultisig:test_op_checkmultisig \
    grader_checks:Exercise2P2pkhAddress:test_p2pkh_address \
    grader_checks:Exercise3P2shAddress:test_p2sh_address \
    grader_checks:Exercise5VerifyP2sh:test_verify_p2sh

python3 - "$REPORT_PATH" "${STUDENT_DIR}/unittest-results.json" \
    "$notebook_status" "$notebook_message" <<'PY'
import json
import sys

sys.path.insert(0, __import__('os').environ['LIB_DIR'])
import report

report_path, results_path, notebook_status, notebook_message = sys.argv[1:5]

with open(results_path) as handle:
    results = json.load(handle)['results']

# Friendlier than the module:Class:method spec the runner takes.
titles = {
    'grader_checks:Exercise1CheckMultisig:test_op_checkmultisig':
        'Exercise 1 — op_checkmultisig',
    'grader_checks:Exercise2P2pkhAddress:test_p2pkh_address':
        'Exercise 2 — h160_to_p2pkh_address',
    'grader_checks:Exercise3P2shAddress:test_p2sh_address':
        'Exercise 3 — h160_to_p2sh_address',
    'grader_checks:Exercise5VerifyP2sh:test_verify_p2sh':
        'Exercise 5 — verify a p2sh transaction',
}

tests = []
for result in results:
    report.add(
        tests,
        titles.get(result['name'], result['name']),
        result['status'],
        result.get('message'),
        result.get('durationMs'),
    )

report.add(
    tests,
    'Chapter8.ipynb runs top to bottom',
    notebook_status,
    notebook_message or None,
)

report.write(report_path, all(t['status'] != 'failed' for t in tests), tests)
PY
