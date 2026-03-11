import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { detectMigrationRisks } from './lib/migration-risk.mjs';

/**
 * @param {string} directory
 * @returns {{ filesScanned: number, warnings: { file: string, code: string, statement: string }[] }}
 */
export function scanMigrationDirectory(directory) {
    const files = readdirSync(directory)
        .filter((name) => name.endsWith('.sql'))
        .sort();
    const warnings = [];

    for (const file of files) {
        const sql = readFileSync(path.join(directory, file), 'utf8');
        const findings = detectMigrationRisks(sql);

        for (const finding of findings) {
            warnings.push({
                file,
                code: finding.code,
                statement: finding.statement,
            });
        }
    }

    return {
        filesScanned: files.length,
        warnings,
    };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
    const directory = process.argv[2] ?? 'drizzle';
    const summary = scanMigrationDirectory(directory);

    console.log(`Scanned ${summary.filesScanned} migration file(s).`);

    for (const warning of summary.warnings) {
        console.log(`::warning file=${directory}/${warning.file}::${warning.code} detected`);
    }

    console.log(`Warnings: ${summary.warnings.length}`);
}
