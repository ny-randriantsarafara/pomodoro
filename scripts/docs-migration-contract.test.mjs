import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync('README.md', 'utf8');
const rollout = readFileSync('docs/implementation/pomodoro-rollout.md', 'utf8');

test('README documents migrate-on-vps and startup migration removal', () => {
    assert.match(readme, /migrate-on-vps/i);
    assert.match(readme, /entrypoint no longer runs migrations on startup/i);
});

test('rollout doc records fail-closed migration gating', () => {
    assert.match(rollout, /validate -> build -> migrate-on-vps -> deploy/i);
    assert.match(rollout, /fail-closed/i);
});
