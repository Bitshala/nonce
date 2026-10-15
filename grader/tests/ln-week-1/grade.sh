#!/usr/bin/env bash
#
# mastering-lightning-network, week 1.
#
# Two containers rather than one, and the only assignment whose solution needs a
# credential minted at run time: Core Lightning's REST interface authenticates
# with a rune, which cannot exist until the node is up. The template's test.sh
# exports CLN_RUNE before calling run.sh and the python/javascript solutions
# read it from the environment, so the grader has to do the same or every
# non-bash submission fails on an unauthenticated request.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected

npm_ci

echo '--- Starting bitcoind and Core Lightning ---'
services_up docker-compose.yml

if ! wait_for_http http://127.0.0.1:18443 90; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'The regtest node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

echo '--- Minting a rune ---'
cln_rune ln-node CLN_RUNE

run_solution

assert_output_file out.txt

jest_report
