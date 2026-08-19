# Database Snapshot & Restore

`scripts/db-snapshot.sh` creates a plain-SQL dump of the Postgres database and saves it as a read-only `.sql` file.

`scripts/db-restore.sh` restores a snapshot into the local Docker Postgres container.

## Prerequisites

- `pg_dump` must be installed (ships with PostgreSQL client tools).

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DB_POSTGRES_HOST` | Database host | Yes |
| `DB_POSTGRES_PORT` | Database port | Yes |
| `DB_POSTGRES_DATABASE_NAME` | Database name | Yes |
| `DB_POSTGRES_USERNAME` | Database user | Yes |
| `DB_POSTGRES_PASSWORD` | Database password | Yes |
| `SNAPSHOT_DIR` | Output directory (default: `./snapshots`) | No |

These are the same `DB_POSTGRES_*` variables the application already uses, so if your shell is configured for running the app you're already set.

## Usage

Both scripts are exposed as npm scripts and can be run from the repo root; paths
below resolve relative to `apps/backend` either way.

```bash
# From the repo root (or with -w @nonce/backend from anywhere)
npm run db:snapshot

# Equivalently, from apps/backend
bash scripts/db-snapshot.sh

# Or inline
DB_POSTGRES_HOST=localhost \
DB_POSTGRES_PORT=5432 \
DB_POSTGRES_DATABASE_NAME=admin \
DB_POSTGRES_USERNAME=admin \
DB_POSTGRES_PASSWORD=secret \
  npm run db:snapshot

# Custom output directory
SNAPSHOT_DIR=./backups npm run db:snapshot
```

The script writes files to `./snapshots/` (or `$SNAPSHOT_DIR`) with the naming pattern `<database>_<YYYYmmdd_HHMMSS>.sql` and sets them to read-only (mode 444).

The dump goes to a temporary dotfile in the same directory and is moved into place only after `pg_dump` succeeds, so a failed run leaves no partial `.sql` behind. That matters because the restore script defaults to the newest `.sql` in the directory — a 0-byte snapshot would otherwise cause the next restore to drop every table and restore nothing.

Note `pg_dump` refuses to dump a server newer than itself. `docker-compose.yml` uses an unpinned `image: postgres`, so the container tracks the latest major version; if you see `aborting because of server version mismatch`, upgrade your local client (`brew upgrade postgresql@18`) or pin the image.

---

## Restoring a Snapshot

`scripts/db-restore.sh` (or `npm run db:restore`) loads a `.sql` snapshot into the `bitshala-db` Docker container defined in the repo-root `docker-compose.yml`. The container must already be running. Docker Compose searches parent directories for the compose file, so this works from `apps/backend` as well as the root.

Flags need `--` when going through npm, e.g. `npm run db:restore -- --list`.

### Prerequisites

- Docker and `docker compose` must be available.
- The `bitshala-db` container must be running (`docker compose up -d bitshala-db`).

The database user (`root`) and name (`bitshala`) are hardcoded to match `docker-compose.yml`. This is intentional — the restore script should only target the local Docker container, never an upstream database.

| Variable | Description | Default |
|---|---|---|
| `SNAPSHOT_DIR` | Directory to look for snapshots | `./snapshots` |

### Options

| Flag | Description |
|---|---|
| `--yes` | Skip the confirmation prompt |
| `--dry-run` | Validate snapshot, container, and DB connectivity without restoring |
| `--list` | List available snapshots with sizes and exit |
| `-h`, `--help` | Show help |

```bash
npm run db:restore -- --list          # what is available
npm run db:restore -- --dry-run       # check container + snapshot without writing
npm run db:restore -- --yes           # restore newest, no prompt
npm run db:restore -- ./snapshots/bitshala_20260810_144640.sql
```

### Usage

```bash
# Restore a specific snapshot
bash scripts/db-restore.sh snapshots/bitshala_20260329_120000.sql

# Restore the latest snapshot in the snapshots directory
bash scripts/db-restore.sh

# Skip confirmation
bash scripts/db-restore.sh --yes

# Check what would happen without restoring
bash scripts/db-restore.sh --dry-run

# List available snapshots
bash scripts/db-restore.sh --list
```

The script will:
1. If no file is given, pick the most recent `.sql` file from `./snapshots/` (or `$SNAPSHOT_DIR`).
2. Error if the `bitshala-db` container is not running or Postgres isn't accepting connections.
3. Ask for confirmation before proceeding (unless `--yes` is passed).
4. Drop all existing tables and enum types in the database.
5. Restore the schema from the snapshot and report any errors.
