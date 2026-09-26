# Assignment grader

These files run from a **separate private repository** — `Bitshala/assignment-grader`
by default, configured as `githubApp.graderRepo`. They are authored here, so that a
change to a test suite is reviewed in the same pull request as the backend change that
depends on it.

**This directory is the source of truth; the grader repo is a published artifact.**
`.github/workflows/publish-grader.yml` mirrors one to the other on every merge to main,
so nothing has to be copied by hand and nobody should edit the artifact directly.

```
assignment-grader/
├── .github/workflows/grade.yml   the only workflow that ever runs
├── run-tests.sh                  language-agnostic entrypoint
├── grade-local.sh                run a suite on your machine
├── publish.sh                    mirrors this directory here (a nonce-side tool;
│                                 it rides along, but has no job in the artifact)
├── report.schema.json            the grading contract
├── manifest.schema.json          what each assignment declares to the workflow
├── lib/                          helpers shared by every grade.sh
│   ├── grade-lib.sh              fixtures, services, readiness, reporting
│   ├── report.py                 runner output -> report.json
│   ├── unittest_json.py          a unittest runner that reports failures
│   └── tree_digest.py            pins a data corpus too big for fixtures/
└── tests/<assignment-slug>/
    ├── manifest.json             toolchains, network policy, timeout
    ├── grade.sh                  per-assignment grader
    └── fixtures/                 files that overwrite the student's copies
```

## Setup

1. Create the repository **private**. It holds `APP_KEY`, which is why it cannot be
   public. (The test suites themselves are not secret — see *What this does and does
   not protect*.)
2. Add two repository secrets, used only by the trusted `fetch` job:
   - `APP_CLIENT_ID` — the GitHub App's Client ID. `actions/create-github-app-token`
     marks the older `app-id` input deprecated, and GitHub recommends the Client ID
     as the JWT issuer.
   - `APP_KEY` — the App's PEM private key, unencoded (not base64 — that encoding
     is only for the backend's config)
3. Point `githubApp.graderRepo` and `githubApp.graderWorkflowFile` at it.
4. Wire up publishing, so the repo stays in step with this directory:
   - `ssh-keygen -t ed25519 -f grader-deploy -N ""`
   - add `grader-deploy.pub` to the grader repo as a deploy key **with write access**
   - add the private half to *this* repo as the `GRADER_DEPLOY_KEY` secret
   - if the repo is not at the default URL, set the `GRADER_REMOTE` repository variable

   A deploy key rather than a token because pushing anything under
   `.github/workflows/` needs `workflow` scope on a PAT, and `grade.yml` is exactly
   that. Deploy keys are not subject to that restriction and are scoped to one repo.

   To seed the repo the first time, or to try a grader change from a branch before
   merging, publish by hand:

   ```shell
   ./grader/publish.sh git@github.com:Bitshala/assignment-grader.git
   ./grader/publish.sh <url> --dry-run   # show what would be pushed
   ```

Student repositories run **no workflows at all**. Every Actions minute this project
consumes is billed against this repository, which is also why student repo visibility
carries no cost implication.

## Adding an assignment

Create `tests/<slug>/`, then set `graderTestPath` to `tests/<slug>` in the assignment
block of the cohort config (`apps/backend/assets/cohort-configs/<cohort>.json`). Copy
`tests/example-week-1` as a starting point.

`grade.sh` receives `STUDENT_DIR`, `TEST_DIR`, `LIB_DIR` and `REPORT_PATH`, and must
write a `report.json` matching `report.schema.json`. Language, test runner, and build
steps are entirely the assignment's business.

All 21 graded weeks have a suite. They come in five shapes:

| Shape | Suites |
| --- | --- |
| jest; bitcoind from a compose file | `bpd-week-1` |
| jest; bitcoind installed onto the runner | `lbtcl-week-1`…`5` |
| jest; bitcoind + Core Lightning, runes minted at run time | `ln-week-1`…`4` |
| jest, fully offline | `bpd-week-2`, `bpd-week-3`, `bpd-week-4` |
| python; notebooks plus a unittest suite | `pb-week-1`…`7` |

`bpd-week-5` is its own thing — an Esplora stack (bitcoind, electrs and the explorer
in one container) served from a regtest chain the template ships, which takes minutes
rather than seconds to answer.

The common jest flow is three helpers — `npm_ci`, `run_solution`, `jest_report` — so a
suite's `grade.sh` carries only what is distinctive about it. The pb weeks are all
driven by `lib/pb_grade.py`, so each of those is the same three lines over a different
`checks.json`.

The bpd capstone has no suite: it is a README with no tests and wants manual grading.

### fixtures/

Anything under `fixtures/` is copied over the student's checkout before the suite runs,
mirroring the repository layout. **Put the test files there.**

The templates ship their own `test/`, `jest.config.ts` and `package.json` so students
can run the suite locally, which is worth keeping — but it means the files that decide
the grade start out inside the tree the student edits. `protectedPaths` refuses the
write in the editor, and restoring here makes it moot if that check is ever wrong: the
student's copy is replaced before it can matter. The same goes for `docker-compose.yml`,
which fixes the credentials and ports the assertions assume.

For `pb-*`, where the book puts each `TestCase` in the same file as the function it
tests, `fixtures/` carries a separate module of authoritative assertions instead.

### Pinned data

Some assignments hand the student a corpus and then check their answer against it.
`bpd-week-3` gives out 8,132 mempool transactions: `mempool.json` decides which txids
count as real, and each transaction's file supplies the `weight` the 4M block limit is
measured against. Both are worth marks to edit.

At 63 MB it is too big to push through `fixtures/` on every run, so `assert_tree_digest`
pins it by hash instead — 64 bytes in `grade.sh`, checked in under a second. Regenerate
after changing a template:

```shell
python3 lib/tree_digest.py <student-repo>/mempool '*.json'
```

Set `protectedPaths` for such an assignment to include the corpus (`mempool/**` here) on
top of the defaults, so the editor refuses the write rather than letting a student
discover the problem only when their run fails.

### Trying it locally

```shell
./grade-local.sh <suite> <student-repo> [--keep]
./grade-local.sh bpd-week-1 ~/Desktop/Projects/bitshala-classrooms/bpd-week-1-assignment
```

Stages the workspace exactly as the `fetch` job does — student tree with `.git`
and `.github` stripped, this assignment's tests, `lib/` beside them — so a suite
that passes here and fails in CI means the two have drifted.

It copies the student repo rather than grading in place, because `restore_fixtures`
overwrites test files and `services_up` leaves a `.compose-file` and `logs/` behind;
pointing it at a template checkout should not edit that checkout. `--keep` leaves
the workspace for inspection.

Toolchain versions are reported rather than installed — it uses whatever you have,
and says so where that differs from the manifest. When a suite asks for python it
builds a venv first, so `pip install` inside a grader does not reach your system
python, which is the isolation `actions/setup-python` provides in CI.

What it does not reproduce: the permission split. Everything runs as you. That
split is about what *student code* can reach, and there is no student here.

### manifest.json

Declares only what the workflow must know before `grade.sh` runs — toolchains to
install, whether student code gets a network, how long to allow. Everything else stays
in `grade.sh`, which is bash and needs no schema. See `manifest.schema.json`; an absent
manifest means "node/python/rust off, network full, no services".

`timeoutMinutes` may only ask for *less* than the assignment's configured
`runTimeoutMinutes`. A suite cannot vote itself more runner time.

## Why the workflow is split in two

`fetch` is trusted: it holds the App token, checks out the student's commit and the test
suite, and executes none of it. `grade` runs the student's code with
`permissions: {}` — a zero-scope `GITHUB_TOKEN` — and references no `secrets.*` at all,
so there is nothing in its environment worth stealing.

The App token `fetch` mints is scoped down to `contents: read` on the single student
repository being graded, rather than carrying every permission the App holds. `fetch`
itself gets `contents: read` at the job level so it can clone this private repository for
the test suite; `grade` inherits the workflow's empty permission set.

Note this departs from the original design sketch, which had `grade` check out the tests
itself. That cannot work: checking out a private repository needs a credential, and
handing one to the job that runs student code defeats the split. `fetch` stages the tests
as an artifact instead, and only this assignment's tests travel — so a bug there cannot
leak the whole suite.

Results come back by the backend reading the `grade-report` artifact with its own App
token, so the workflow needs no outbound credential either.

## Network policy

`manifest.json` sets `network` to `full` or `none`.

Every assignment in these courses needs `full`, and that is the default. They install
jest, pull container images, `pip install`, or — in the case of
learning-bitcoin-from-command-line week 1 — have the student's own `setup.sh` download
Bitcoin Core, which is the exercise itself. There is nothing to vendor.

`none` runs student code via `unshare --net`, and is available for a future assignment
that is genuinely self-contained. Two things make it sharper than it looks:

- A fresh network namespace has `lo` present but **DOWN**. `run-tests.sh` brings it up,
  without which every test that talks to `127.0.0.1` fails to connect — which is most of
  them, since bitcoind is reached over loopback.
- Containers are unreachable under it regardless. The daemon lives outside the
  namespace, so published ports are not visible inside. `services` with `network: none`
  is rejected at manifest-read time rather than failing obscurely an hour later.

## What this does and does not protect

**It does** guarantee students cannot *modify* the tests. The suite lives here, students
have no access to this repository, the commit endpoint refuses to write the harness
paths, and `restore_fixtures` overwrites them anyway — which is what makes a passing
score mean something.

**It does not** hide the tests, and for the current 21 suites it never did: the template
repositories under `Bitshala-Classrooms` are public, and they ship `test/*.spec.ts` so
students can run the suite locally. Every assertion is already readable from a browser.
The private grader repo protects `APP_KEY`, not the tests.

Even for an assignment whose tests were only here, student code executes in the same job
as the test files, so a determined student could print them to the run log.

Treat hidden tests as a deterrent, not a boundary. If a specific assignment needs more,
the options in rough order of effort are: run the suite as a separate unix user with the
test directory unreadable by the student-code user; keep the decisive assertions out of
the shipped test files; or accept that assignment as open-book.
