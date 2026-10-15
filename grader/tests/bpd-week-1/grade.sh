#!/usr/bin/env bash
#
# bitcoin-protocol-development, week 1.
#
# Unlike the LBTCL week 1 assignment, the node is given rather than built: the
# student's job starts at the RPC boundary. The compose file is restored from
# fixtures/ because it fixes the credentials and the port the suite asserts
# against, which makes it part of the test, not part of their workspace.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected

npm_ci

echo '--- Starting bitcoind ---'
services_up docker-compose.yaml

# `up -d` returns once the container exists, which is several seconds before
# bitcoind binds 18443. Every assertion in this suite goes over RPC, so without
# the wait the first one loses a race the student can neither see nor fix.
if ! wait_for_http http://127.0.0.1:18443 90; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'The regtest node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

run_solution

assert_output_file out.txt

jest_report
