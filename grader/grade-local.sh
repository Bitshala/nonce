#!/usr/bin/env bash
#
# Run one suite against a checkout on this machine, the way grade.yml would.
#
#   ./grade-local.sh <suite> <student-repo> [--keep]
#   ./grade-local.sh pb-week-5 ~/Desktop/Projects/bitshala-classrooms/pb-week-5-assignment
#
# This is the only way to try a grader without pushing to the private repo and
# burning an Actions run, so it stages things exactly as the `fetch` job does:
# the student tree with .git and .github stripped, this assignment's tests, and
# lib/ beside them. A suite that passes here and fails in CI means the two have
# drifted, and that is worth knowing.
#
# --keep leaves the workspace behind. Reach for it when a grader fails and you
# want to see what the student tree looked like at the end.
#
# What it deliberately does not reproduce: the permission split. Everything runs
# as you, with your network and your Docker. The split is about what a *student*
# can reach, and there is no student here.

set -euo pipefail

GRADER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "usage: $(basename "$0") <suite> <student-repo> [--keep]" >&2
    echo >&2
    echo "suites:" >&2
    for dir in "${GRADER_DIR}"/tests/*/; do
        echo "  $(basename "$dir")" >&2
    done
    exit 2
}

[ $# -ge 2 ] || usage

SUITE="$1"
STUDENT_SRC="$2"
KEEP="${3:-}"

TEST_SRC="${GRADER_DIR}/tests/${SUITE}"
[ -d "$TEST_SRC" ] || { echo "No suite at tests/${SUITE}" >&2; usage; }
[ -d "$STUDENT_SRC" ] || { echo "No student repo at ${STUDENT_SRC}" >&2; exit 2; }

WORKSPACE="$(mktemp -d "${TMPDIR:-/tmp}/grade-${SUITE}-XXXXXX")"
cleanup() {
    if [ "$KEEP" = '--keep' ]; then
        echo
        echo "Workspace kept at ${WORKSPACE}"
    else
        rm -rf "$WORKSPACE"
    fi
}
trap cleanup EXIT

echo "Suite:     ${SUITE}"
echo "Student:   ${STUDENT_SRC}"
echo "Workspace: ${WORKSPACE}"
echo

# Copy rather than grade in place. restore_fixtures overwrites the student's
# test files and services_up drops a .compose-file and logs/ beside them —
# doing that to someone's actual template checkout would be rude at best and,
# if that checkout is the upstream template, destructive.
mkdir -p "${WORKSPACE}/student"
cp -R "${STUDENT_SRC}/." "${WORKSPACE}/student/"
rm -rf "${WORKSPACE}/student/.git" "${WORKSPACE}/student/.github"

# Stage the suite the way `fetch` does: the assignment's own files, the shared
# entrypoint, and lib/ beside them.
mkdir -p "${WORKSPACE}/tests"
cp -R "${TEST_SRC}/." "${WORKSPACE}/tests/"
cp "${GRADER_DIR}/run-tests.sh" "${WORKSPACE}/tests/run-tests.sh"
rm -rf "${WORKSPACE}/tests/lib"
cp -R "${GRADER_DIR}/lib" "${WORKSPACE}/tests/lib"

read_manifest() {
    python3 - "$@" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
manifest = json.loads(path.read_text()) if path.exists() else {}
toolchains = manifest.get('toolchains', {})
print(manifest.get('network', 'full'))
print(toolchains.get('node', ''))
print(toolchains.get('python', ''))
print(toolchains.get('rust', ''))
PY
}

# Plain reads rather than mapfile: macOS still ships bash 3.2 as /bin/bash, and
# a convenience script is a poor place to depend on someone's homebrew.
{
    read -r NETWORK
    read -r WANT_NODE
    read -r WANT_PYTHON
    read -r WANT_RUST
} < <(read_manifest "${WORKSPACE}/tests/manifest.json")

# The workflow installs exactly what the manifest asks for. Here we use whatever
# you have, so say plainly where the two differ — a grader that passes on your
# node 22 and fails on CI's node 20 is a confusing afternoon.
check_version() {
    local label="$1" wanted="$2" actual="$3"
    [ -n "$wanted" ] || return 0
    if [ -z "$actual" ]; then
        echo "  ${label}: manifest wants ${wanted}, not installed here"
        return 0
    fi
    if [[ "$actual" == "$wanted"* ]]; then
        echo "  ${label}: ${actual} (manifest wants ${wanted})"
    else
        echo "  ${label}: ${actual} — CI will use ${wanted}"
    fi
}

echo "Toolchains:"
check_version node "$WANT_NODE" "$(node -v 2>/dev/null | tr -d v)"
check_version python "$WANT_PYTHON" "$(python3 -V 2>/dev/null | awk '{print $2}')"
check_version rust "$WANT_RUST" "$(rustc -V 2>/dev/null | awk '{print $2}')"

# actions/setup-python gives CI a python of its own, so a grader can `pip
# install` freely. On your machine that would be your system python, so stand up
# a venv and put it first on PATH — grade.sh stays identical either way.
if [ -n "$WANT_PYTHON" ]; then
    echo "  creating a venv so pip install does not touch your system python"
    python3 -m venv "${WORKSPACE}/venv"
    PATH="${WORKSPACE}/venv/bin:${PATH}"
    export PATH
fi

if [ "$NETWORK" = 'none' ] && ! command -v unshare >/dev/null 2>&1; then
    echo
    echo "Note: this suite asks for network isolation, which needs Linux."
    echo "      It will run with network access here, as it would on a runner"
    echo "      that cannot provide a namespace."
fi

echo
echo "=============================== grading ==============================="
echo

STATUS=0
env \
    STUDENT_DIR="${WORKSPACE}/student" \
    TEST_DIR="${WORKSPACE}/tests" \
    LIB_DIR="${WORKSPACE}/tests/lib" \
    REPORT_PATH="${WORKSPACE}/report.json" \
    ASSIGNMENT_SLUG="$SUITE" \
    GRADE_NETWORK="$NETWORK" \
    bash "${WORKSPACE}/tests/run-tests.sh" || STATUS=$?

echo
echo "================================ report ==============================="
echo

if [ -s "${WORKSPACE}/report.json" ]; then
    python3 - "${WORKSPACE}/report.json" "$STATUS" <<'PY'
import json, sys

report = json.load(open(sys.argv[1]))
exit_status = sys.argv[2]

print('PASSED' if report['passed'] else 'FAILED')
print()
def summarise(message):
    """
    One line that says what went wrong.

    A python traceback puts that on its last line and "Traceback (most recent
    call last):" on its first, so taking the first line would print the same
    eight useless words next to every failure.
    """
    lines = [line for line in message.strip().splitlines() if line.strip()]
    if not lines:
        return ''
    if lines[0].startswith('Traceback (most recent call last)'):
        return lines[-1].strip()
    return lines[0].strip()


marks = {'passed': '  ok  ', 'failed': ' FAIL ', 'skipped': ' skip '}
for test in report['tests']:
    print(f"{marks.get(test['status'], '  ?   ')} {test['name']}")
    if test.get('message'):
        print(f"        {summarise(test['message'])[:100]}")

# run-tests.sh promises these agree, and the backend trusts that promise: it
# prefers the report but falls back to the conclusion when the artifact is
# missing. A mismatch here is a grader bug worth failing loudly over.
expected = '0' if report['passed'] else '1'
if exit_status != expected:
    print()
    print(f'!! report says passed={report["passed"]} but the grader exited {exit_status}')
    print('!! these must agree — the backend falls back to the exit status')
    sys.exit(1)
PY
else
    echo 'No report was written at all. run-tests.sh should have made one —'
    echo 'that it did not is a bug in the grader, not in the submission.'
    STATUS=1
fi

exit "$STATUS"
