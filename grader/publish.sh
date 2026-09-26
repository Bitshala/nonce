#!/usr/bin/env bash
#
# Publish this directory to the root of the grader repository.
#
#   ./grader/publish.sh                      # uses githubApp.graderRepo's default
#   ./grader/publish.sh git@github.com:Bitshala-Classrooms/assignment-grader.git
#   ./grader/publish.sh <url> --dry-run
#
# The grader repo is a *published artifact*, not a place to edit. This
# directory is the source of truth: it is reviewed in the same pull request as
# the backend that dispatches it, which is the whole reason it lives here.
#
# `git subtree split` rewrites the history of grader/ into a standalone history
# whose root is this directory, so `.github/workflows/grade.yml` lands where the
# grader repo needs it — at the top level, not under grader/.
#
# Normally you should not need to run this by hand:
# .github/workflows/publish-grader.yml does it on every merge to main. This is
# for bootstrapping the repo the first time, or publishing from a branch to try
# a grader change before merging.

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
PREFIX="$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"

REMOTE_URL="${1:-git@github.com:Bitshala-Classrooms/assignment-grader.git}"
DRY_RUN="${2:-}"

cd "$REPO_ROOT"

if [ -n "$(git status --porcelain -- "$PREFIX")" ]; then
    echo "error: ${PREFIX}/ has uncommitted changes." >&2
    echo "       subtree split reads committed history, so they would not be published." >&2
    exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Publishing ${PREFIX}/ from ${BRANCH} to ${REMOTE_URL}"

# Lands on a detached ref rather than a branch, so this leaves no local
# bookkeeping behind for someone to trip over later. Progress goes to stderr as
# one line per commit walked, which buries the useful output.
SPLIT_SHA="$(git subtree split --prefix="$PREFIX" HEAD 2>/dev/null)"
echo "  split commit: ${SPLIT_SHA:0:12}"
echo "  tree: $(git ls-tree --name-only "$SPLIT_SHA" | tr '\n' ' ')"

# The grader repo needs grade.yml at this exact path. If the split root were
# ever wrong the push would still succeed and the workflow would simply never
# be found, so check it here rather than discover it on the next dispatch.
if ! git cat-file -e "${SPLIT_SHA}:.github/workflows/grade.yml" 2>/dev/null; then
    echo "error: .github/workflows/grade.yml is not at the root of the split." >&2
    exit 1
fi
echo "  grade.yml: present at the root"

if [ "$DRY_RUN" = '--dry-run' ]; then
    echo "  (dry run — not pushing)"
    exit 0
fi

# Force, because the grader repo mirrors this directory and nothing else writes
# to it. A non-fast-forward there means someone edited the artifact by hand,
# and this directory still wins.
git push --force "$REMOTE_URL" "${SPLIT_SHA}:refs/heads/main"
echo "  pushed to main"
