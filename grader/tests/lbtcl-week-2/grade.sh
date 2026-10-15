#!/usr/bin/env bash
#
# learning-bitcoin-from-command-line, week 2.
#
# Unlike week 1 — where writing setup.sh *is* the exercise — weeks 2 through 5
# ship a finished setup-bitcoin-node.sh. That makes it infrastructure rather
# than student work, so it is restored from fixtures/: it fixes the rpcauth
# credentials and the regtest settings the assertions assume, and a student
# editing it would only break their own run.
#
# No containers. The node is installed onto the runner itself.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected
npm_ci

echo '--- Installing and starting Bitcoin Core ---'
chmod +x setup-bitcoin-node.sh
if ! bash setup-bitcoin-node.sh; then
    fail_early 'Bitcoin Core starts' \
        'The provided setup-bitcoin-node.sh failed. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

# The script backgrounds bitcoind and returns; the port is live a moment later.
# A 401 to an unauthenticated probe is a perfectly good "it is listening".
if ! wait_for_http http://127.0.0.1:18443 60; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'The regtest node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

run_solution

assert_output_file parent.json
assert_output_file child.json
assert_output_file parent-rbf.json

jest_report

# Not in a container, so nothing else stops it. The runner is discarded either
# way; this just keeps the log honest.
pkill -x bitcoind 2>/dev/null || true
