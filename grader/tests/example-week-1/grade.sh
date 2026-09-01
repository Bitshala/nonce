#!/usr/bin/env bash
#
# Reference grader. Copy this directory per assignment and replace the body.
#
# Environment (from run-tests.sh):
#   STUDENT_DIR   student code
#   TEST_DIR      this directory
#   REPORT_PATH   where to write report.json
#
# The only hard requirement is writing a report.json that matches
# ../../report.schema.json. Everything else — language, runner, build steps — is
# up to the assignment.

set -uo pipefail

cd "$STUDENT_DIR"

# Stand-in check: the student has to have written something. Replace with the
# real test invocation, then translate its output into report.json below.
if [ -f README.md ] && [ "$(find . -type f -not -path './.git/*' | wc -l)" -gt 1 ]; then
  passed=true
  detail='Found student files.'
else
  passed=false
  detail='The repository looks untouched.'
fi

python3 - "$REPORT_PATH" "$passed" "$detail" <<'PY'
import json, sys
path, passed, detail = sys.argv[1], sys.argv[2] == 'true', sys.argv[3]
with open(path, 'w') as handle:
    json.dump({
        'schemaVersion': 1,
        'passed': passed,
        'tests': [{
            'name': 'repository contains student work',
            'status': 'passed' if passed else 'failed',
            'message': detail,
        }],
    }, handle)
PY
