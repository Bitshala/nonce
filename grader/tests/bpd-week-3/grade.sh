#!/usr/bin/env bash
#
# bitcoin-protocol-development, week 3 — Mine your first block.
#
# The student is given 8,132 mempool transactions and has to assemble a valid
# block from them, writing the header, the coinbase, and the included txids to
# out.txt.
#
# The template splits its checks across four spec files with a shell script
# each — sanity-checks.sh, header-checks.sh, coinbase-checks.sh,
# block-checks.sh — so a student can work through them one at a time. That is a
# development aid, not a grading scheme: jest's testRegex already picks up all
# four, so one invocation covers everything and the report carries a single
# verdict. Every check has to pass.
#
# No containers here. Unlike the other bpd weeks there is no node to talk to —
# the whole exercise is offline, against files in the repository.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

# mempool/ is too big to restore on every run — 63 MB, 8,132 files — but it is
# still test data rather than the student's workspace. block.spec.ts checks
# their block against it: `mempool.json` decides which txids count as real, and
# each transaction's own file supplies the `weight` the 4M limit is measured
# against. Editing either is worth marks, so the corpus is pinned by digest and
# checked here instead.
#
# Regenerate after changing the template:
#   python3 lib/tree_digest.py <student-repo>/mempool '*.json'
assert_tree_digest mempool '*.json' \
    9399b9613b6026e475f0736808383076fe2b878915864515acdf374416767b8d

cd "$STUDENT_DIR"

assert_language_selected

npm_ci

run_solution

assert_output_file out.txt

# One run over all four specs. header.spec.ts asserts the block time is within
# two hours of now, so a submission that passed yesterday is not guaranteed to
# pass today — that is the assignment's design, and re-running re-mines.
jest_report
