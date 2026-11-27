#!/usr/bin/env bash

set -euo pipefail

week="${1:-}"
template="${2:-}"
mode="${3:-}"
if [[ ! "$week" =~ ^[1-8]$ || ! -d "$template" || ( -n "$mode" && "$mode" != --check ) || $# -gt 3 ]]; then
    echo "Usage: $0 <week 1-8> <template checkout> [--check]" >&2
    exit 2
fi

suite="$(cd "$(dirname "$0")/../tests/bbr-week-${week}" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/bbr-fixtures-XXXXXX")"
trap 'rm -rf "$work"' EXIT

(
    cd "$template"
    CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$work/target}" \
        cargo test --locked --color never --test assignment_tests -- --list --format terse
) | sed -n 's/: test$//p' | LC_ALL=C sort > "$work/test-names.txt"
if [ ! -s "$work/test-names.txt" ]; then
    echo 'The Rust test harness listed no tests.' >&2
    exit 1
fi

if [ "$mode" = --check ]; then
    diff -u "$suite/test-names.txt" "$work/test-names.txt"
    for file in Cargo.toml Cargo.lock tests/assignment_tests.rs; do
        diff -u "$suite/crate/$file" "$template/$file"
    done
else
    for file in Cargo.toml Cargo.lock tests/assignment_tests.rs; do
        cp "$template/$file" "$suite/crate/$file"
    done
    cp "$work/test-names.txt" "$suite/test-names.txt"
fi
