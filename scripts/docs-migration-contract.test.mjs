import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync('README.md', 'utf8');
const docsIndex = readFileSync('docs/README.md', 'utf8');
const runbook = readFileSync('docs/implementation/ci-vps-migration-runbook.md', 'utf8');
const sessionWorkflow = readFileSync('docs/features/session-workflow.md', 'utf8');

test('README documents migrate-on-vps and startup migration removal', () => {
    assert.match(readme, /migrate-on-vps/i);
    assert.match(readme, /entrypoint no longer runs migrations on startup/i);
});

test('runbook records fail-closed migration gating', () => {
    assert.match(runbook, /validate.*build.*migrate-on-vps.*deploy/is);
    assert.match(runbook, /fail-closed/i);
});

test('docs index includes merged session workflow doc', () => {
    assert.match(docsIndex, /features\/session-workflow\.md/);
    assert.match(sessionWorkflow, /manual session entry/i);
    assert.match(sessionWorkflow, /edit session/i);
    assert.match(sessionWorkflow, /delete session/i);
});
