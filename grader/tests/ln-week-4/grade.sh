#!/usr/bin/env bash
#
# mastering-lightning-network, week 4.
#
# bitcoind plus Core Lightning nodes named alice, bob and carol, each needing a rune
# of its own before the student's code can reach it over clnrest.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected
npm_ci

echo '--- Starting bitcoind and the Lightning nodes ---'
services_up docker-compose.yml

if ! wait_for_http http://127.0.0.1:18443 90; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'The regtest node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

echo '--- Minting runes ---'
cln_rune alice ALICE_RUNE
cln_rune bob BOB_RUNE
cln_rune carol CAROL_RUNE

run_solution

assert_output_file out.txt

jest_report
