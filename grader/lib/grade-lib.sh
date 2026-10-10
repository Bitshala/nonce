#!/usr/bin/env bash
#
# Helpers every grade.sh shares. Source it:
#
#   source "${LIB_DIR}/grade-lib.sh"
#
# The three jobs here are the ones each assignment would otherwise reimplement
# slightly differently: putting the authoritative test files back, bringing a
# regtest stack up and waiting for it, and reporting.

# shellcheck shell=bash

LIB_DIR="${LIB_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
REPORT_PY="${LIB_DIR}/report.py"
UNITTEST_JSON_PY="${LIB_DIR}/unittest_json.py"
TREE_DIGEST_PY="${LIB_DIR}/tree_digest.py"

# ---------------------------------------------------------------------------
# Authoritative files
# ---------------------------------------------------------------------------

# Copy TEST_DIR/fixtures over the student's checkout, replacing whatever is
# there. This is what makes a passing score mean something.
#
# The templates ship their own test/, jest.config.ts and package.json so
# students can run the suite locally, and `protectedPaths` stops the editor
# committing changes to them — but that check lives in the backend, and a score
# should not depend on one service getting a path glob right. Restoring here
# makes tampering a no-op at the point it would otherwise pay off.
#
# Anything under fixtures/ wins, including files the student deleted.
restore_fixtures() {
    local fixtures="${TEST_DIR}/fixtures"
    [ -d "$fixtures" ] || return 0

    echo "Restoring authoritative files from fixtures/"
    # Print what was replaced: when a grade is disputed this is the record of
    # exactly which files the student's copies did not decide.
    (cd "$fixtures" && find . -type f | sed 's|^\./|  |')

    # Trailing /. copies the directory's contents rather than the directory.
    cp -Rf "${fixtures}/." "${STUDENT_DIR}/"
}

# Fail unless a directory the tests trust is exactly what this assignment pins.
#
# For a corpus too large to restore through fixtures on every run. The student
# is given the data and asked to work from it; the suite then checks their
# answer against the same data, so an edit there is worth marks and has to be
# caught. Regenerate the expected value with:
#
#   python3 lib/tree_digest.py <student-repo>/<dir> '<glob>'
assert_tree_digest() {
    local relative="${1:?assert_tree_digest needs a directory}"
    local pattern="${2:?assert_tree_digest needs a glob}"
    local expected="${3:?assert_tree_digest needs a digest}"

    echo "Verifying ${relative} against the pinned digest"
    if ! python3 "$TREE_DIGEST_PY" "${STUDENT_DIR}/${relative}" "$pattern" \
        --check "$expected"; then
        fail_early "${relative} is unmodified" \
            "The files in ${relative} are not the ones this assignment provides. They are the input your block is checked against, so they cannot be edited. Restore them from the template and run again."
    fi
}

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

_COMPOSE_FILE=''

# Bring up a compose stack and tear it down however this script exits.
#
# The compose file must come from fixtures/, not from the student's tree: it
# decides which bitcoind and which credentials the tests talk to, so it is part
# of the test suite.
services_up() {
    local compose="${1:?services_up needs a compose file}"
    _COMPOSE_FILE="${STUDENT_DIR}/${compose}"

    if [ ! -f "$_COMPOSE_FILE" ]; then
        echo "::error::No compose file at ${compose}"
        return 1
    fi

    trap services_down EXIT
    # A cancelled or timed-out job never runs the trap, so leave the workflow's
    # always() cleanup step something to act on.
    printf '%s' "$_COMPOSE_FILE" > "${STUDENT_DIR}/.compose-file"

    echo "Starting services from ${compose}"
    # Check this: a container that cannot start — a port already taken on the
    # host is the usual cause — otherwise shows up minutes later as "the node
    # never became ready", which sends whoever reads it looking at the node.
    if ! docker compose -f "$_COMPOSE_FILE" up -d --quiet-pull; then
        docker compose -f "$_COMPOSE_FILE" ps -a
        fail_early 'the assignment services started' \
            'A container failed to start. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
    fi

    # `up -d` can still report success while leaving a container behind, so
    # confirm what is actually running rather than trusting the exit status.
    local stopped
    stopped="$(docker compose -f "$_COMPOSE_FILE" ps -a \
        --filter status=created --filter status=exited --format '{{.Name}}')"
    if [ -n "$stopped" ]; then
        echo "::error::These containers did not start: ${stopped}"
        docker compose -f "$_COMPOSE_FILE" ps -a
        fail_early 'the assignment services started' \
            "Containers failed to start: ${stopped}. This is an infrastructure failure, not your solution — please re-run, and report it if it persists."
    fi

    # Container logs are the only way to diagnose a node that came up wrong, and
    # they are gone once the stack is down.
    mkdir -p "${STUDENT_DIR}/logs"
    docker compose -f "$_COMPOSE_FILE" logs -f \
        > "${STUDENT_DIR}/logs/docker.log" 2>&1 &
}

services_down() {
    [ -n "$_COMPOSE_FILE" ] || return 0
    echo "Stopping services"
    # -v drops the volumes too; a leftover regtest chain would be a stale
    # starting state if the runner were ever reused.
    docker compose -f "$_COMPOSE_FILE" down -v --remove-orphans || true
    _COMPOSE_FILE=''
}

# Poll until a URL answers, or give up.
#
# `docker compose up -d` returns as soon as the containers are created, which is
# well before bitcoind is accepting RPC. Without this the first test reliably
# loses a race that the student cannot see and cannot fix.
wait_for_http() {
    local url="${1:?wait_for_http needs a url}"
    local seconds="${2:-90}"

    echo "Waiting up to ${seconds}s for ${url}"
    for _ in $(seq "$seconds"); do
        # Any HTTP answer means the port is live. bitcoind replies 401 to an
        # unauthenticated probe, which is a perfectly good readiness signal, so
        # --fail would be wrong here.
        if curl --silent --output /dev/null --max-time 2 "$url"; then
            echo "  ready"
            return 0
        fi
        sleep 1
    done

    echo "::error::${url} never became ready"
    return 1
}

# Same, for a command that starts failing and then succeeds.
wait_for_command() {
    local seconds="${1:?wait_for_command needs a timeout}"
    shift

    echo "Waiting up to ${seconds}s for: $*"
    for _ in $(seq "$seconds"); do
        if "$@" >/dev/null 2>&1; then
            echo "  ready"
            return 0
        fi
        sleep 1
    done

    echo "::error::Timed out waiting for: $*"
    return 1
}

# ---------------------------------------------------------------------------
# The jest flow
# ---------------------------------------------------------------------------
#
# Fourteen of these assignments are the same three steps around a different
# middle: install the runner, run the student's script, grade what it wrote.
# Only the middle — which services, which output file — differs.

# --ignore-scripts because package.json is ours but the dependency tree is not,
# and nothing in a jest install needs a lifecycle hook.
npm_ci() {
    echo '--- Installing test dependencies ---'
    if ! npm ci --ignore-scripts --no-audit --no-fund; then
        fail_early 'test dependencies installed' \
            'npm ci failed. This is a fault in the assignment template, not your solution — please report it.'
    fi
}

# Not fatal on its own: a solution can exit non-zero having already written a
# correct answer, and the assertions are the real verdict. A genuine failure
# shows up as a missing output file immediately after.
run_solution() {
    echo '--- Running the solution ---'
    chmod +x run.sh ./bash/*.sh ./python/*.sh ./javascript/*.sh ./rust/*.sh 2>/dev/null
    bash run.sh || echo "::warning::run.sh exited non-zero; grading the output anyway"
}

# Wait for a Core Lightning node, then mint a rune for it and export it.
#
# lightningd waits on bitcoind itself, so it is ready meaningfully later than
# its container is. And clnrest authenticates with a rune that cannot exist
# until the node is up, which the python and javascript solutions read from the
# environment — the template's own test.sh exports it the same way, so a grader
# that skips this fails every non-bash submission.
#
#   cln_rune alice ALICE_RUNE
cln_rune() {
    local container="${1:?cln_rune needs a container}"
    local variable="${2:?cln_rune needs a variable name}"

    if ! wait_for_command 180 \
        docker exec "$container" lightning-cli --network=regtest getinfo; then
        fail_early "the ${container} Lightning node is running" \
            "The ${container} node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists."
    fi

    local rune
    rune="$(docker exec "$container" lightning-cli --network=regtest \
        createrune restrictions='[]' \
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["rune"])')"
    if [ -z "$rune" ]; then
        fail_early "a rune could be minted for ${container}" \
            "Could not mint a Core Lightning rune for ${container}. This is an infrastructure failure, not your solution — please re-run, and report it if it persists."
    fi

    export "${variable}=${rune}"
    echo "  ${variable} minted for ${container}"
}

jest_report() {
    echo '--- Running the test suite ---'
    npx jest --json --outputFile="${STUDENT_DIR}/jest-results.json" \
        --testLocationInResults
    report_from_jest "${STUDENT_DIR}/jest-results.json"
}

# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

report_from_jest() {
    python3 "$REPORT_PY" from-jest "${1:?}" "$REPORT_PATH"
}

report_from_unittest() {
    python3 "$REPORT_PY" from-unittest "${1:?}" "$REPORT_PATH"
}

report_single() {
    python3 "$REPORT_PY" single "$REPORT_PATH" "${1:?}" "${2:?}" "${3:-}"
}

report_merge() {
    python3 "$REPORT_PY" merge "$REPORT_PATH" "$@"
}

# Bail out with a one-line report. For the preconditions that make running the
# suite pointless — no output file, a build that did not compile — where jest's
# own failure would be noise around a cause the student can act on.
fail_early() {
    report_single failed "${1:?}" "${2:-}"
    exit 1
}

# `run.sh` is how these templates let a student pick a language: four commented
# runner lines, one of which they uncomment. Left untouched it exits 0 having
# done nothing, the suite then tests a tree with no output in it, and the
# failure reads as though their code was wrong.
assert_language_selected() {
    local runner="${STUDENT_DIR}/run.sh"
    [ -f "$runner" ] || return 0

    if ! grep -qE '^[[:space:]]*/bin/bash[[:space:]]+\./(bash|python|javascript|rust)/run-' "$runner"; then
        fail_early \
            'a language is selected in run.sh' \
            'run.sh still has every runner commented out. Uncomment the line for the language you wrote your solution in, then run again.'
    fi
}

# Check the student produced the file the suite reads before running the suite,
# for the same reason.
assert_output_file() {
    local path="${1:?}"
    if [ ! -s "${STUDENT_DIR}/${path}" ]; then
        fail_early \
            "${path} was produced" \
            "Your solution did not create ${path}, or created it empty. The tests read their inputs from that file."
    fi
}
