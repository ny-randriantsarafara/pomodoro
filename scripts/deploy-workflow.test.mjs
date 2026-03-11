import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

test('deploy workflow defines migrate-on-vps job', () => {
    assert.match(workflow, /\n  migrate-on-vps:\n/);
    assert.match(workflow, /\n    name: Run DB migrations on VPS\n/);
});

test('deploy job depends on migrate-on-vps', () => {
    assert.match(workflow, /needs:\s*\[build,\s*prepare-deploy,\s*migrate-on-vps\]/);
});
