# Assignment grader

These files belong in a **separate private repository** — `bitshala/assignment-grader`
by default, configured as `githubApp.graderRepo`. They live here so they are reviewed
alongside the backend that dispatches them; copy the contents of this directory to the
root of that repository.

```
assignment-grader/
├── .github/workflows/grade.yml   the only workflow that ever runs
├── run-tests.sh                  language-agnostic entrypoint
├── grade-local.sh                run a suite on your machine
├── report.schema.json            the grading contract
├── manifest.schema.json          what each assignment declares to the workflow
├── lib/                          helpers shared by every grade.sh
│   ├── grade-lib.sh              fixtures, services, readiness, reporting
│   ├── report.py                 runner output -> report.json
│   └── unittest_json.py          a unittest runner that reports failures
└── tests/<assignment-slug>/
    ├── manifest.json             toolchains, network policy, timeout
    ├── grade.sh                  per-assignment grader
    └── fixtures/                 files that overwrite the student's copies
```

## Setup

1. Create the repository **private**. It holds every test suite, so it can never be
   public.
2. Add two repository secrets, used only by the trusted `fetch` job:
   - `APP_CLIENT_ID` — the GitHub App's Client ID. `actions/create-github-app-token`
     marks the older `app-id` input deprecated, and GitHub recommends the Client ID
     as the JWT issuer.
   - `APP_KEY` — the App's PEM private key, unencoded (not base64 — that encoding
     is only for the backend's config)
3. Point `githubApp.graderRepo` and `githubApp.graderWorkflowFile` at it.

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

Four worked examples, covering the shapes the real courses take:

| Suite | Shape |
| --- | --- |
| `tests/lbtcl-week-1` | jest; the student's own `setup.sh` installs and starts bitcoind |
| `tests/bpd-week-1` | jest; bitcoind from a compose file |
| `tests/ln-week-1` | jest; bitcoind + Core Lightning, and a rune minted at run time |
| `tests/pb-week-5` | python; Jupyter notebook plus a unittest suite |

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

**It does not** make the tests unreadable to code that is already running. Student code
executes in the same job as the test files, so a determined student could print them.
Network isolation stops them shipping the contents anywhere, but stdout still reaches the
run log, which their own API access can read — and no current assignment can use that
isolation.

Treat hidden tests as a deterrent, not a boundary. If a specific assignment needs more,
the options in rough order of effort are: run the suite as a separate unix user with the
test directory unreadable by the student-code user; keep the decisive assertions out of
the shipped test files; or accept that assignment as open-book.
