#!/usr/bin/env bash
#
# programming-bitcoin. Every week has the same shape — chapter directories, a
# notebook each, and exercises the notebook runs — so the work is in
# lib/pb_grade.py and the per-week difference is entirely checks.json.
#
# fixtures/ carries this week's assertions, lifted out of the student-edited
# modules by tools/extract-pb-checks.py. Regenerate after a template change:
#
#   tools/extract-pb-checks.py <template-repo> tests/<slug>

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

# Drops grader_checks_*.py into each chapter, beside the student's code.
restore_fixtures

cd "$STUDENT_DIR"

echo '--- Installing dependencies ---'
# Week 1 predates the shared requirements.txt and installs jupyter by hand in
# its own test.sh; fall back to the same set so it grades like the rest.
if [ -f requirements.txt ]; then
    deps=(-r requirements.txt)
else
    deps=(jupyter jupyterlab requests)
fi
if ! python3 -m pip install --quiet --disable-pip-version-check "${deps[@]}"; then
    fail_early 'dependencies installed' \
        'pip install failed. This is a fault in the assignment template, not your solution — please report it.'
fi

python3 "${LIB_DIR}/pb_grade.py" "${TEST_DIR}/checks.json" "$REPORT_PATH"
