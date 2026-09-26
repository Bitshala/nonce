#!/usr/bin/env bash
#
# bitcoin-protocol-development, week 5 — wallet balance from an Esplora index.
#
# The heaviest stack of the set: blockstream/esplora runs bitcoind, electrs and
# the explorer in one container, served from a pre-built regtest chain the
# template ships in data/.
#
# That chain is copied to tmp-data before the container mounts it, so the run
# never writes to the committed copy — a container that mutated data/ in place
# would leave the next student's clone with a different chain.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected
npm_ci

echo '--- Staging the regtest chain ---'
rm -rf ./tmp-data
if ! cp -R ./data ./tmp-data; then
    fail_early 'the regtest chain is present' \
        'Could not stage data/. That directory ships with the assignment and has to stay in place.'
fi

echo '--- Starting Esplora ---'
services_up docker-compose.yaml

# Esplora is bitcoind plus an electrs index plus a web tier, all started in
# sequence inside one container. It is minutes, not seconds, before the API
# answers, and the student's code has nothing to query until it does.
if ! wait_for_http http://localhost:8094/regtest/api/blocks/tip/height 300; then
    fail_early 'the Esplora API is answering' \
        'The explorer never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

run_solution

assert_output_file out.txt

jest_report

rm -rf ./tmp-data
