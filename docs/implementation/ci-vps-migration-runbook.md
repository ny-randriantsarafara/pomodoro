# CI-Driven VPS Migration Runbook

## Purpose

Run database migrations explicitly from CI, inside the VPS network, before application deployment.

This avoids internet-exposed DB access and removes implicit schema changes during app startup.

## Pipeline Contract

Main branch deployment order:

1. `validate` (lint + tests)
2. `build` (image publish)
3. `migrate-on-vps` (risk scan + remote migration)
4. `deploy` (only if migration succeeded)

`deploy` is fail-closed behind `migrate-on-vps`.

## Migration Execution Model

`migrate-on-vps` performs two stages:

1. **Warning-only risk scan**
   - command: `npm run db:check-risk`
   - scanner inspects `drizzle/*.sql`
   - reports warnings for risky statements (`DROP`, `TRUNCATE`, unbounded `DELETE`)
   - does not block pipeline on warnings

2. **Remote migration inside VPS**
   - CI SSHes to VPS with host key verification
   - writes temporary env file containing `DATABASE_URL`
   - pulls image `ghcr.io/ny-randriantsarafara/pomodoro:latest`
   - runs one-shot container:
     - network: `vps-net`
     - command: `node scripts/migrate.mjs`
   - removes temporary env file on exit

## Runtime Behavior Change

Application startup no longer runs migrations in `scripts/entrypoint.sh`.

Startup now only runs:

```sh
exec node server.js
```

## Operational Notes

- DB remains private to VPS networking.
- Migration retries are done by rerunning pipeline after corrective action.
- No automatic rollback is attempted.
- For emergency manual execution, run the migration container from inside VPS network only.

## Verification Artifacts

The repository includes targeted checks for this contract:

- `scripts/lib/migration-risk.test.mjs`
- `scripts/check-migration-risk.test.mjs`
- `scripts/deploy-workflow.test.mjs`
- `scripts/entrypoint.test.mjs`
- `scripts/docs-migration-contract.test.mjs`
