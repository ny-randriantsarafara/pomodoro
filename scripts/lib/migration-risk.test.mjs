import assert from 'node:assert/strict';
import test from 'node:test';
import { detectMigrationRisks } from './migration-risk.mjs';

test('detectMigrationRisks detects destructive migration statements', () => {
    const sql = `
        DROP TABLE users;
        ALTER TABLE sessions DROP COLUMN notes;
        TRUNCATE TABLE events;
        DELETE FROM audit_logs;
    `;

    const findings = detectMigrationRisks(sql);

    assert.deepEqual(
        findings.map((finding) => finding.code),
        [
            'MIGRATION_RISK_DROP_TABLE',
            'MIGRATION_RISK_DROP_COLUMN',
            'MIGRATION_RISK_TRUNCATE',
            'MIGRATION_RISK_DELETE_WITHOUT_WHERE',
        ],
    );

    assert.equal(findings[0].statement.includes('DROP TABLE users'), true);
    assert.equal(findings[1].statement.includes('DROP COLUMN notes'), true);
    assert.equal(findings[2].statement.includes('TRUNCATE TABLE events'), true);
    assert.equal(findings[3].statement.includes('DELETE FROM audit_logs'), true);
});

test('detectMigrationRisks ignores safe statements', () => {
    const sql = `
        CREATE TABLE safe_table (id INTEGER PRIMARY KEY);
        ALTER TABLE safe_table ADD COLUMN name TEXT;
        UPDATE safe_table SET name = 'ok' WHERE id = 1;
        DELETE FROM safe_table WHERE id = 1;
    `;

    assert.deepEqual(detectMigrationRisks(sql), []);
});

test('detectMigrationRisks ignores commented-out destructive statements', () => {
    const sql = `
        -- DROP TABLE users;
        /* TRUNCATE TABLE events; */
        /*
          ALTER TABLE sessions DROP COLUMN notes;
        */
        -- DELETE FROM audit_logs;
    `;

    assert.deepEqual(detectMigrationRisks(sql), []);
});

test('detectMigrationRisks ignores destructive keywords inside strings and procedural blocks', () => {
    const sql = `
        INSERT INTO migration_logs(message) VALUES('DROP TABLE users; this is text');
        DO $body$
        BEGIN
          PERFORM 'TRUNCATE TABLE events;';
          RAISE NOTICE 'DELETE FROM audit_logs;';
        END;
        $body$;
    `;

    assert.deepEqual(detectMigrationRisks(sql), []);
});

test('detectMigrationRisks flags DELETE without WHERE when WHERE appears outside delete clause', () => {
    const sql = `
        WITH stale_rows AS (
          SELECT id FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days'
        )
        DELETE FROM audit_logs;

        DELETE FROM audit_logs /* WHERE id = 1 */;
        DELETE FROM audit_logs RETURNING 'WHERE token';
    `;

    const findings = detectMigrationRisks(sql);

    assert.deepEqual(
        findings.map((finding) => finding.code),
        [
            'MIGRATION_RISK_DELETE_WITHOUT_WHERE',
            'MIGRATION_RISK_DELETE_WITHOUT_WHERE',
            'MIGRATION_RISK_DELETE_WITHOUT_WHERE',
        ],
    );
});

test('detectMigrationRisks flags outer DELETE without WHERE when CTE DELETE has WHERE', () => {
    const sql = `
        WITH purged AS (
          DELETE FROM sessions WHERE expires_at < NOW() RETURNING id
        )
        DELETE FROM audit_logs;
    `;

    const findings = detectMigrationRisks(sql);

    assert.deepEqual(
        findings.map((finding) => finding.code),
        ['MIGRATION_RISK_DELETE_WITHOUT_WHERE'],
    );
});
