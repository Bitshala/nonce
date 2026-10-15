#!/usr/bin/env bash
#
# bitcoin-protocol-development, week 2.
#
# Deserialise and inspect a raw transaction with bcoin.
#
# The only bpd weeks with nothing to talk to: no node, no containers, no
# network once the dependencies are in. Everything the assertions need is
# either in out.txt or hard-coded in the spec.

set -uo pipefail

source "${LIB_DIR}/grade-lib.sh"

restore_fixtures

cd "$STUDENT_DIR"

assert_language_selected
npm_ci
run_solution

assert_output_file out.txt

jest_report
