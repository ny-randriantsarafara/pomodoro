import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');

test('entrypoint does not execute migration script', () => {
    assert.doesNotMatch(entrypoint, /migrate\.mjs/);
});

test('entrypoint launches app server', () => {
    assert.match(entrypoint, /exec node server\.js/);
});
