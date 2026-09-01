#!/usr/bin/env bash
#
# Language-agnostic grading entrypoint.
#
# Contract with grade.yml:
#   STUDENT_DIR           checked-out student code, .github and .git removed
#   TEST_DIR              this assignment's tests (this script lives here too)
#   REPORT_PATH           where report.json must be written
#   ASSIGNMENT_SLUG       for logging
#   GRADE_DISABLE_NETWORK '1' to run student code without network access
#
# Contract with the backend: write report.json matching report.schema.json and
# exit non-zero when the tests did not pass. The backend prefers the report and
# falls back to the exit status, so both must agree.
#
# Per-assignment work goes in TEST_DIR/grade.sh, which this dispatches to. That
# keeps language choice a property of the assignment rather than of the platform.

set -euo pipefail

: "${STUDENT_DIR:?STUDENT_DIR is required}"
: "${TEST_DIR:?TEST_DIR is required}"
: "${REPORT_PATH:?REPORT_PATH is required}"
ASSIGNMENT_SLUG="${ASSIGNMENT_SLUG:-unknown}"
GRADE_DISABLE_NETWORK="${GRADE_DISABLE_NETWORK:-0}"

echo "Grading ${ASSIGNMENT_SLUG}"
echo "  student: ${STUDENT_DIR}"
echo "  tests:   ${TEST_DIR}"

write_failure_report() {
  local message="$1"
  python3 - "$REPORT_PATH" "$message" <<'PY'
import json, sys
path, message = sys.argv[1], sys.argv[2]
with open(path, 'w') as handle:
    json.dump({
        'schemaVersion': 1,
        'passed': False,
        'tests': [{'name': 'grader', 'status': 'failed', 'message': message}],
    }, handle)
PY
}

if [ ! -x "${TEST_DIR}/grade.sh" ] && [ ! -f "${TEST_DIR}/grade.sh" ]; then
  echo "::error::No grade.sh in ${TEST_DIR}"
  write_failure_report "This assignment has no grader script."
  exit 1
fi

# Running without a network is the strongest sandbox available on a shared
# runner, but `unshare` needs privileges that are not guaranteed everywhere.
# Degrade to a warning rather than failing the grade — an ungraded submission is
# worse than an imperfectly sandboxed one.
run_graded() {
  if [ "$GRADE_DISABLE_NETWORK" = '1' ] && command -v unshare >/dev/null 2>&1; then
    if unshare --net --map-root-user true >/dev/null 2>&1; then
      echo "Running student code with no network access"
      unshare --net --map-root-user bash "${TEST_DIR}/grade.sh"
      return
    fi
    echo "::warning::Network isolation unavailable on this runner; grading with network access"
  fi
  bash "${TEST_DIR}/grade.sh"
}

export STUDENT_DIR TEST_DIR REPORT_PATH ASSIGNMENT_SLUG

status=0
run_graded || status=$?

if [ ! -s "$REPORT_PATH" ]; then
  write_failure_report "The grader exited with status ${status} without writing a report."
  exit 1
fi

# The report is authoritative; the exit status only mirrors it.
python3 - "$REPORT_PATH" <<'PY'
import json, sys
with open(sys.argv[1]) as handle:
    report = json.load(handle)
sys.exit(0 if report.get('passed') else 1)
PY
