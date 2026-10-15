#!/usr/bin/env bash
#
# Reference grader. Copy this directory per assignment and replace the body.
#
# Environment (from run-tests.sh):
#   STUDENT_DIR   student code
#   TEST_DIR      this directory
#   LIB_DIR       shared helpers
#   REPORT_PATH   where to write report.json
#
# The only hard requirement is writing a report.json that matches
# ../../report.schema.json. Everything else — language, runner, build steps — is
# up to the assignment. lib/grade-lib.sh carries the parts that would otherwise
# be reimplemented per assignment; `source` it and the helpers below are the
# whole vocabulary.
#
# A real one usually reads:
#
#   restore_fixtures                        # our test files beat theirs
#   cd "$STUDENT_DIR"
#   assert_language_selected                # run.sh still all comments?
#   npm_ci
#   services_up docker-compose.yml          # torn down on exit
#   wait_for_http http://127.0.0.1:18443 90 # `up -d` returns too early
#   run_solution
#   assert_output_file out.txt
#   jest_report
#
# See tests/bpd-week-1 for that shape with containers, tests/lbtcl-week-1 for it
# without, tests/ln-week-1 for one that also mints a rune, and tests/pb-week-5
# for a python assignment (those are all driven by lib/pb_grade.py, so the
# per-week file is three lines).

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

# Anything in fixtures/ overwrites the student's copy. Put the test files there
# — that is what stops "make the test pass" and "edit the test" being the same
# move. No fixtures/ directory, no-op.
restore_fixtures

cd "$STUDENT_DIR"

# Stand-in check: the student has to have written something. Replace with the
# real test invocation, then translate its output with one of the report_*
# helpers.
if [ -f README.md ] && [ "$(find . -type f -not -path './.git/*' | wc -l)" -gt 1 ]; then
    report_single passed 'repository contains student work' 'Found student files.'
else
    report_single failed 'repository contains student work' 'The repository looks untouched.'
fi
