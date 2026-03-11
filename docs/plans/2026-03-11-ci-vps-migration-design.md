# CI VPS Migration Design

Date: 2026-03-11  
Status: Approved

## Context

Current behavior runs database migrations at app container startup (`scripts/entrypoint.sh`), which makes schema changes implicit on every restart/redeploy.

Constraints:
- Production DB is not internet-accessible.
- Migration must run either through a tunnel or from inside the VPS network.
- Solution must stay clear and maintainable.

## Decisions (Validated)

- Migration execution location: **inside VPS**.
- Destructive migration detection policy: **warn only** (non-blocking).
- Deployment policy on migration failure: **fail-closed** (do not deploy app).

## Chosen Approach

Add an explicit `migrate-on-vps` job to CI before deploy.

Flow:
1. `validate` and `build` run as today.
2. `migrate-on-vps` runs after `build`.
3. `migrate-on-vps`:
   - scans `drizzle/*.sql` for risky SQL patterns and reports warnings,
   - SSHes to VPS,
   - runs a one-shot migration command from the new image inside VPS networking,
   - fails fast on non-zero exit.
4. `deploy` runs only if `migrate-on-vps` succeeds.
5. App startup no longer runs migrations.

## Alternative Approaches Considered

1. Dedicated `migrator` service in compose.
   - Pros: explicit infra role.
   - Cons: extra service complexity to maintain.

2. Single VPS `deploy.sh` orchestrating pull+migrate+restart.
   - Pros: centralizes VPS ops logic.
   - Cons: less transparent in CI pipeline.

## Architecture & Data Flow

- CI remains the orchestration source of truth.
- VPS remains the execution boundary for DB access.
- Migration becomes a controlled, explicit stage.
- App rollout is gated on successful schema application.

## Components

### 1. CI Workflow (`.github/workflows/deploy.yml`)

- Add `migrate-on-vps` job between `build` and `deploy`.
- Set `deploy.needs` to include `migrate-on-vps`.

### 2. Risk Scan Script (`scripts/check-migration-risk.mjs`)

- Parse `drizzle/*.sql`.
- Detect risky patterns:
  - `DROP TABLE`
  - `DROP COLUMN`
  - `TRUNCATE`
  - `DELETE` without `WHERE` (heuristic)
- Emit warnings only (no non-zero exit due to warnings).

### 3. VPS One-Shot Migration Run

- Executed via SSH from CI.
- Uses the built app image and VPS runtime env (`DATABASE_URL`).
- Runs only migration command (`node scripts/migrate.mjs`).
- Container removed after completion (`--rm`).

### 4. App Entrypoint (`scripts/entrypoint.sh`)

- Remove migration command.
- Keep startup as app launch only.

## Failure Handling

- Migration failure blocks deployment (`fail-closed`).
- No automatic SQL rollback.
- Recovery path is explicit corrective migration and rerun.

## Observability

Pipeline logs must include:
- risk scan start/end + warnings summary,
- SSH connection and migration start/end,
- success/failure status with exit code.

## Validation Strategy

Before merge:
- Run migration script against a test DB.
- Verify app entrypoint boots without running migrations.
- Trigger workflow manually (`workflow_dispatch`) to validate VPS execution path.
- Confirm failure case blocks deploy as expected.

## Non-Goals

- Building automatic reversible migrations.
- Exposing DB publicly.
- Adding tunnel-based CI DB access for this iteration.

