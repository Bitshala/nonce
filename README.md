# nonce

The Bitshala portal monorepo: NestJS API, React admin/student frontend, and the
wire contract they share.

```
apps/backend      NestJS + TypeORM + Postgres  (@nonce/backend)
apps/frontend     Vite + React 19              (@nonce/frontend)
packages/shared   enums, scoring constants, cohort names, DTO interfaces  (@nonce/shared)
```

Formed by merging `Bitshala/admin-backend` and `Bitshala/portal-frontend`. Both
histories are preserved in full — `git log --follow apps/frontend/<file>` reaches
back past the merge.

One exception: `packages/shared/src/enums.ts` was moved out of the backend and
reindented in the same commit, which drops it under git's default 50% rename
similarity threshold. Use `git log --follow -M40% packages/shared/src/enums.ts`
to see its full history.

## Prerequisites

- Node.js >= 20.12 and npm
- Docker (for Postgres, Redis, and Mailcrab)

## Setup

```shell
npm install
npm run build:shared     # <- required before anything typechecks; see below
```

Copy `apps/backend/config/dev.config.example.yaml` to
`apps/backend/config/dev.config.yaml` and fill it in. That file is gitignored and
holds real credentials — never commit it.

## Running

```shell
docker compose up -d                          # Postgres, Redis, Mailcrab
npm run migration:run -w @nonce/backend
npm run dev:backend                           # NestJS, watch mode
npm run dev:frontend                          # Vite dev server
```

The frontend reads `VITE_API_BASE_URL` from its environment.

## Checks

```shell
npm run typecheck      # builds shared, then typechecks all three workspaces
npm run test           # backend jest suite
npm run lint
npm run build          # shared -> backend -> frontend, in that order
npm run format:check   # backend + shared only (see backlog note below)
```

## Things worth knowing before you change something

**Build `@nonce/shared` before you typecheck.** Both apps resolve it through
`node_modules` to its compiled `dist/`, so a fresh clone fails typecheck until
`npm run build:shared` has run. The root `typecheck` and `build` scripts do this
for you in the right order; a bare `tsc` in one app will not. Use
`npm run dev -w @nonce/shared` for a watch build while editing the contract.

**Shared is a real package, not a path alias.** Resolving it via a tsconfig
`paths` entry would pull it into the backend's compilation program, and because
the backend sets `outDir` without `rootDir`, TypeScript would move the inferred
common root up and silently relocate output from `dist/src/main.js` to
`dist/apps/backend/src/main.js` — breaking the Dockerfile entrypoint,
`start:prod`, and the `nest-cli.json` asset paths at once.

**Shared ships dual CJS + ESM, and both are needed.** In CommonJS, TypeScript
compiles `export *` into an `__exportStar(require(...))` helper whose named
exports Rollup cannot see, so a CJS-only build fails the vite build. The
`typesVersions` block mirrors `exports` because the backend's tsconfig leaves
`moduleResolution` unset and therefore uses Node10, which ignores `exports`
entirely. Dropping either mechanism breaks one consumer.

**`overrides` belongs in the root `package.json`.** npm ignores it in a workspace
package without warning. `multer` and `js-yaml` are pinned there for security.

**The backend compiles to `dist/src/main.js`,** not `dist/main.js` — see the
`outDir`/`rootDir` note above.

**Adding a field to the contract.** Add it to the interface in
`packages/shared/src/dto/`, then to the backend DTO class. The class declares
`implements` against the interface, so forgetting the second half is a compile
error (`TS2420`) rather than something the frontend discovers at runtime. Only
wire shapes belong in shared — frontend render models (e.g.
`apps/frontend/src/types/instructions.ts`) stay in the frontend.

## Known backlog

- The frontend has **12 eslint errors** and **114 files** prettier would
  reformat, both inherited — it had no CI at all before the merge. Its CI lane
  runs those checks with `continue-on-error` so the lane is useful rather than
  permanently red. Clear the backlog, then make them blocking.
- `apps/frontend/package.json` pins `unocss` to exactly `66.1.2`. Later 66.x
  releases pull in the native `oxc-parser`, whose platform binding npm fails to
  install, which breaks the vite build. Upgrading unocss needs its own PR.
- DTO extraction into `@nonce/shared` is partial. `common` and `cohorts` are
  done; `scores`, `users`, `teaching-assistants`, `certificates`, `feedback`, and
  `fellowships` still have hand-maintained mirrors in
  `apps/frontend/src/types/`.
