# Assignment grader

These files belong in a **separate private repository** — `bitshala/assignment-grader`
by default, configured as `githubApp.graderRepo`. They live here so they are reviewed
alongside the backend that dispatches them; copy the contents of this directory to the
root of that repository.

```
assignment-grader/
├── .github/workflows/grade.yml   the only workflow that ever runs
├── run-tests.sh                  language-agnostic entrypoint
├── report.schema.json            the grading contract
└── tests/<assignment-slug>/
    └── grade.sh                  per-assignment grader
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

Create `tests/<slug>/grade.sh`, then set `graderTestPath` to `tests/<slug>` in the
assignment block of the cohort config
(`apps/backend/assets/cohort-configs/<cohort>.json`). Copy `tests/example-week-1` as a
starting point.

`grade.sh` receives `STUDENT_DIR`, `TEST_DIR`, and `REPORT_PATH`, and must write a
`report.json` matching `report.schema.json`. Language, test runner, and build steps are
entirely the assignment's business.

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

## What this does and does not protect

**It does** guarantee students cannot *modify* the tests. The suite lives here, students
have no access to this repository, and the commit endpoint refuses to write
`.github/**` — which is what makes a passing score mean something.

**It does not** make the tests unreadable to code that is already running. Student code
executes in the same job as the test files, so a determined student could print them.
Network isolation (`GRADE_DISABLE_NETWORK`) stops them shipping the contents anywhere,
but stdout still reaches the run log, which their own API access can read.

Treat hidden tests as a deterrent, not a boundary. If a specific assignment needs more,
the options in rough order of effort are: run the suite as a separate unix user with the
test directory unreadable by the student-code user; keep the decisive assertions out of
the shipped test files; or accept that assignment as open-book.
