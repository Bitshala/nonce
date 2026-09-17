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

echo '--- Installing test dependencies ---'
if ! npm ci --ignore-scripts --no-audit --no-fund; then
    fail_early 'test dependencies installed' \
        'npm ci failed. This is a fault in the assignment template, not your solution — please report it.'
fi

echo '--- Starting bitcoind and Core Lightning ---'
services_up docker-compose.yml

if ! wait_for_http http://127.0.0.1:18443 90; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'The regtest node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

# lightningd waits on bitcoind itself, so it is ready meaningfully later than
# the container is. Ask it something only a started node can answer.
if ! wait_for_command 120 \
    docker exec ln-node lightning-cli --network=regtest getinfo; then
    fail_early 'Core Lightning is running' \
        'The Lightning node never became ready. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi

# The suite drives CLN over `docker exec`, but the python and javascript
# solutions talk to clnrest over HTTP and need a rune to do it.
CLN_RUNE="$(docker exec ln-node lightning-cli --network=regtest \
    createrune restrictions='[]' | python3 -c 'import json,sys; print(json.load(sys.stdin)["rune"])')"
if [ -z "$CLN_RUNE" ]; then
    fail_early 'a CLN rune could be minted' \
        'Could not mint a Core Lightning rune. This is an infrastructure failure, not your solution — please re-run, and report it if it persists.'
fi
export CLN_RUNE

echo '--- Running the solution ---'
chmod +x run.sh ./bash/*.sh ./python/*.sh ./javascript/*.sh ./rust/*.sh 2>/dev/null
bash run.sh || echo "::warning::run.sh exited non-zero; grading the output anyway"

assert_output_file out.txt

echo '--- Running the test suite ---'
npx jest --json --outputFile="${STUDENT_DIR}/jest-results.json" --testLocationInResults
report_from_jest "${STUDENT_DIR}/jest-results.json"
