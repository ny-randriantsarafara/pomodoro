# CI-Driven VPS Migration Runbook

## Objective

Apply schema migrations from CI without exposing production database access to the public internet.

Core rule: migrations run **inside VPS networking** before app deploy.

## Deployment Contract

Main branch workflow order:

1. `validate` (lint + tests)
2. `build` (publish image)
3. `migrate-on-vps` (risk scan + remote migration run)
4. `deploy` (runs only when migration succeeds)

`deploy` is fail-closed behind `migrate-on-vps`.

## `migrate-on-vps` Job Behavior

### 1) Warning-Only Migration Risk Scan

- command: `npm run db:check-risk`
- target: `drizzle/*.sql`
- warning patterns: `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE ...` without `WHERE`
- policy: warnings are logged but non-blocking

### 2) Remote Migration Run On VPS

- CI connects over SSH with strict host key verification
- temporary env file is created with `DATABASE_URL`
- image `ghcr.io/ny-randriantsarafara/pomodoro:latest` is pulled
- one-shot migration container runs on `vps-net`:

```bash
docker run --rm --network vps-net --env-file <temp-env> \
  ghcr.io/ny-randriantsarafara/pomodoro:latest \
  node scripts/migrate.mjs
```

- temporary env file is removed after execution

## Application Startup Contract

`scripts/entrypoint.sh` no longer runs migrations.
It only starts the app server:

```sh
exec node server.js
```

## Failure Handling

- migration failure stops workflow before deploy
- no automatic rollback
- recovery is explicit: fix migration, rerun pipeline

## Manual Emergency Run

If CI is unavailable, run migration from inside VPS network only:

```bash
docker run --rm --network vps-net \
  -e DATABASE_URL='postgresql://...' \
  ghcr.io/ny-randriantsarafara/pomodoro:latest \
  node scripts/migrate.mjs
```

## Verification Coverage

- `scripts/lib/migration-risk.test.mjs`
- `scripts/check-migration-risk.test.mjs`
- `scripts/deploy-workflow.test.mjs`
- `scripts/entrypoint.test.mjs`
- `scripts/docs-migration-contract.test.mjs`
