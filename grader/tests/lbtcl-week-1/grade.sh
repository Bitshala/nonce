#!/usr/bin/env bash
#
# learning-bitcoin-from-command-line, week 1 — Setting Up and Interacting with
# a Bitcoin Node.
#
# The unusual part of this one: the student writes setup.sh, and that script
# downloading and starting Bitcoin Core *is* the exercise. So this grader runs
# student-authored code to produce the node it then tests against, and the
# assignment cannot run under `network: none` — there is nothing to vendor,
# the download is the thing being graded.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

# Ours, not theirs: test/, jest.config.ts, package.json, tsconfig.json.
restore_fixtures

cd "$STUDENT_DIR"

# Four commented runner lines, one of which the student uncomments. Left alone,
# run.sh succeeds having done nothing and every assertion fails on a missing
# out.txt — which reads as "your solution is wrong" rather than "you skipped a
# step in the README".
assert_language_selected

npm_ci

echo '--- Running setup.sh (student-authored) ---'
chmod +x setup.sh
if ! bash setup.sh; then
    fail_early 'setup.sh installs and starts Bitcoin Core' \
        'setup.sh exited non-zero. It has to download Bitcoin Core 27.1, install the binaries, write ~/.bitcoin/bitcoin.conf, and start bitcoind in regtest.'
fi

# setup.sh backgrounds bitcoind with -daemon and sleeps 5, which is optimistic
# on a cold runner. Wait for the RPC port properly; 401 to an unauthenticated
# probe is a perfectly good "it is listening".
if ! wait_for_http http://127.0.0.1:18443 60; then
    fail_early 'bitcoind is accepting RPC on 18443' \
        'Bitcoin Core never started listening on 127.0.0.1:18443. Check that setup.sh writes regtest=1, server=1, txindex=1 and the rpcauth line into ~/.bitcoin/bitcoin.conf, and that it launches bitcoind with -daemon.'
fi

run_solution

assert_output_file out.txt

jest_report

# bitcoind is not in a container here, so nothing tears it down for us. The
# runner is discarded either way; this just keeps the log honest.
pkill -x bitcoind 2>/dev/null || true
