#!/usr/bin/env bash
#
# Language-agnostic grading entrypoint.
#
# Contract with grade.yml:
#   STUDENT_DIR     checked-out student code, .github and .git removed
#   TEST_DIR        this assignment's tests (this script lives here too)
#   LIB_DIR         shared helpers (lib/)
#   REPORT_PATH     where report.json must be written
#   ASSIGNMENT_SLUG for logging
#   GRADE_NETWORK   'full' or 'none', from the assignment manifest
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
LIB_DIR="${LIB_DIR:-${TEST_DIR}/lib}"
ASSIGNMENT_SLUG="${ASSIGNMENT_SLUG:-unknown}"
GRADE_NETWORK="${GRADE_NETWORK:-full}"

echo "Grading ${ASSIGNMENT_SLUG}"
echo "  student: ${STUDENT_DIR}"
echo "  tests:   ${TEST_DIR}"
echo "  network: ${GRADE_NETWORK}"

write_failure_report() {
    python3 "${LIB_DIR}/report.py" single "$REPORT_PATH" failed grader "$1"
}

if [ ! -f "${TEST_DIR}/grade.sh" ]; then
    echo "::error::No grade.sh in ${TEST_DIR}"
    write_failure_report "This assignment has no grader script."
    exit 1
fi

# Running without a network is the strongest sandbox available on a shared
# runner, but it is only correct for an assignment that declared it can live
# without one — see manifest.schema.json. `unshare` also needs privileges that
# are not guaranteed everywhere, so a runner that cannot provide it degrades to
# a warning: an ungraded submission is worse than an imperfectly sandboxed one.
#
# A fresh network namespace comes with `lo` present but DOWN, so bringing it up
# is not optional housekeeping — every one of these assignments talks to
# bitcoind over 127.0.0.1, and without this they all fail to connect.
run_graded() {
    if [ "$GRADE_NETWORK" != 'none' ]; then
        bash "${TEST_DIR}/grade.sh"
        return
    fi

    if ! command -v unshare >/dev/null 2>&1 \
        || ! unshare --net --map-root-user true >/dev/null 2>&1; then
        echo "::warning::Network isolation unavailable on this runner; grading with network access"
        bash "${TEST_DIR}/grade.sh"
        return
    fi

    echo "Running student code with no network access"
    unshare --net --map-root-user bash -c '
        ip link set lo up 2>/dev/null || ifconfig lo up 2>/dev/null || {
            echo "::warning::Could not bring up loopback; tests using 127.0.0.1 will fail"
        }
        exec bash "$1"
    ' _ "${TEST_DIR}/grade.sh"
}

export STUDENT_DIR TEST_DIR LIB_DIR REPORT_PATH ASSIGNMENT_SLUG GRADE_NETWORK

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
