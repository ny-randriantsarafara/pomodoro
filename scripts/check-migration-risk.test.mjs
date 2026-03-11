import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanMigrationDirectory } from './check-migration-risk.mjs';

test('scanMigrationDirectory returns warning summary for risky migrations', () => {
    const root = mkdtempSync(join(tmpdir(), 'migration-risk-'));
    const drizzleDir = join(root, 'drizzle');
    mkdirSync(drizzleDir, { recursive: true });

    writeFileSync(join(drizzleDir, '0001_safe.sql'), 'CREATE TABLE task (id TEXT PRIMARY KEY);', 'utf8');
    writeFileSync(join(drizzleDir, '0002_risky.sql'), 'DROP TABLE sessions;', 'utf8');

    const result = scanMigrationDirectory(drizzleDir);

    assert.equal(result.filesScanned, 2);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].file, '0002_risky.sql');
    assert.equal(result.warnings[0].code, 'MIGRATION_RISK_DROP_TABLE');
});

test('scanMigrationDirectory ignores non-sql files', () => {
    const root = mkdtempSync(join(tmpdir(), 'migration-risk-'));
    const drizzleDir = join(root, 'drizzle');
    mkdirSync(drizzleDir, { recursive: true });

    writeFileSync(join(drizzleDir, 'README.md'), 'ignore me', 'utf8');
    writeFileSync(join(drizzleDir, '0003_safe.sql'), 'ALTER TABLE task ADD COLUMN name TEXT;', 'utf8');

    const result = scanMigrationDirectory(drizzleDir);

    assert.equal(result.filesScanned, 1);
    assert.deepEqual(result.warnings, []);
});
