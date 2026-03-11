const RISK_PATTERNS = [
    { code: 'MIGRATION_RISK_DROP_TABLE', regex: /\bDROP\s+TABLE\b/i },
    { code: 'MIGRATION_RISK_DROP_COLUMN', regex: /\bDROP\s+COLUMN\b/i },
    { code: 'MIGRATION_RISK_TRUNCATE', regex: /\bTRUNCATE(?:\s+TABLE)?\b/i },
];

function getDollarQuoteTag(sql, start) {
    if (sql[start] !== '$') {
        return null;
    }

    const second = sql[start + 1];
    if (second === '$') {
        return '$$';
    }

    if (!/[A-Za-z_]/.test(second ?? '')) {
        return null;
    }

    let end = start + 2;
    while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) {
        end += 1;
    }

    if (sql[end] !== '$') {
        return null;
    }

    return sql.slice(start, end + 1);
}

function splitSqlStatements(sql) {
    const statements = [];
    let current = '';
    let inLineComment = false;
    let blockCommentDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let dollarQuoteTag = null;

    for (let i = 0; i < sql.length; i += 1) {
        const char = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            current += char;
            if (char === '\n') {
                inLineComment = false;
            }
            continue;
        }

        if (blockCommentDepth > 0) {
            current += char;
            if (char === '/' && next === '*') {
                current += next;
                blockCommentDepth += 1;
                i += 1;
                continue;
            }
            if (char === '*' && next === '/') {
                current += next;
                blockCommentDepth -= 1;
                i += 1;
            }
            continue;
        }

        if (inSingleQuote) {
            current += char;
            if (char === "'") {
                if (next === "'") {
                    current += next;
                    i += 1;
                } else {
                    inSingleQuote = false;
                }
            }
            continue;
        }

        if (inDoubleQuote) {
            current += char;
            if (char === '"') {
                if (next === '"') {
                    current += next;
                    i += 1;
                } else {
                    inDoubleQuote = false;
                }
            }
            continue;
        }

        if (dollarQuoteTag) {
            if (sql.startsWith(dollarQuoteTag, i)) {
                current += dollarQuoteTag;
                i += dollarQuoteTag.length - 1;
                dollarQuoteTag = null;
                continue;
            }
            current += char;
            continue;
        }

        if (char === '-' && next === '-') {
            current += '--';
            inLineComment = true;
            i += 1;
            continue;
        }

        if (char === '/' && next === '*') {
            current += '/*';
            blockCommentDepth = 1;
            i += 1;
            continue;
        }

        if (char === "'") {
            current += char;
            inSingleQuote = true;
            continue;
        }

        if (char === '"') {
            current += char;
            inDoubleQuote = true;
            continue;
        }

        const dollarTag = getDollarQuoteTag(sql, i);
        if (dollarTag) {
            current += dollarTag;
            i += dollarTag.length - 1;
            dollarQuoteTag = dollarTag;
            continue;
        }

        if (char === ';') {
            const statement = current.trim();
            if (statement) {
                statements.push(statement);
            }
            current = '';
            continue;
        }

        current += char;
    }

    const tail = current.trim();
    if (tail) {
        statements.push(tail);
    }

    return statements;
}

function stripSqlNoise(sql) {
    let out = '';
    let inLineComment = false;
    let blockCommentDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let dollarQuoteTag = null;

    for (let i = 0; i < sql.length; i += 1) {
        const char = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            if (char === '\n') {
                inLineComment = false;
                out += '\n';
            } else {
                out += ' ';
            }
            continue;
        }

        if (blockCommentDepth > 0) {
            if (char === '/' && next === '*') {
                blockCommentDepth += 1;
                out += '  ';
                i += 1;
                continue;
            }
            if (char === '*' && next === '/') {
                blockCommentDepth -= 1;
                out += '  ';
                i += 1;
                continue;
            }
            out += char === '\n' ? '\n' : ' ';
            continue;
        }

        if (inSingleQuote) {
            if (char === "'" && next === "'") {
                out += '  ';
                i += 1;
                continue;
            }

            out += char === '\n' ? '\n' : ' ';
            if (char === "'") {
                inSingleQuote = false;
            }
            continue;
        }

        if (inDoubleQuote) {
            if (char === '"' && next === '"') {
                out += '  ';
                i += 1;
                continue;
            }

            out += char === '\n' ? '\n' : ' ';
            if (char === '"') {
                inDoubleQuote = false;
            }
            continue;
        }

        if (dollarQuoteTag) {
            if (sql.startsWith(dollarQuoteTag, i)) {
                out += ' '.repeat(dollarQuoteTag.length);
                i += dollarQuoteTag.length - 1;
                dollarQuoteTag = null;
                continue;
            }

            out += char === '\n' ? '\n' : ' ';
            continue;
        }

        if (char === '-' && next === '-') {
            inLineComment = true;
            out += '  ';
            i += 1;
            continue;
        }

        if (char === '/' && next === '*') {
            blockCommentDepth = 1;
            out += '  ';
            i += 1;
            continue;
        }

        if (char === "'") {
            inSingleQuote = true;
            out += ' ';
            continue;
        }

        if (char === '"') {
            inDoubleQuote = true;
            out += ' ';
            continue;
        }

        const dollarTag = getDollarQuoteTag(sql, i);
        if (dollarTag) {
            out += ' '.repeat(dollarTag.length);
            i += dollarTag.length - 1;
            dollarQuoteTag = dollarTag;
            continue;
        }

        out += char;
    }

    return out;
}

function hasTopLevelWhere(sql) {
    let depth = 0;

    for (let i = 0; i < sql.length; i += 1) {
        const char = sql[i];

        if (char === '(') {
            depth += 1;
            continue;
        }

        if (char === ')') {
            depth = Math.max(0, depth - 1);
            continue;
        }

        if (depth !== 0 || !/[A-Za-z_]/.test(char)) {
            continue;
        }

        let end = i + 1;
        while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) {
            end += 1;
        }

        if (sql.slice(i, end).toUpperCase() === 'WHERE') {
            return true;
        }

        i = end - 1;
    }

    return false;
}

function hasDeleteWithoutWhere(normalizedStatement) {
    const deleteMatches = Array.from(normalizedStatement.matchAll(/\bDELETE\s+FROM\b/gi));
    if (deleteMatches.length === 0) {
        return false;
    }

    for (let i = 0; i < deleteMatches.length; i += 1) {
        const start = deleteMatches[i].index;
        const end = i + 1 < deleteMatches.length ? deleteMatches[i + 1].index : normalizedStatement.length;
        const deleteClause = normalizedStatement.slice(start, end);

        if (!hasTopLevelWhere(deleteClause)) {
            return true;
        }
    }

    return false;
}

/**
 * @param {string} sql
 * @returns {{ code: string, statement: string }[]}
 */
export function detectMigrationRisks(sql) {
    const findings = [];
    const statements = splitSqlStatements(String(sql ?? ''));

    for (const statement of statements) {
        const normalizedStatement = stripSqlNoise(statement);

        for (const risk of RISK_PATTERNS) {
            if (risk.regex.test(normalizedStatement)) {
                findings.push({ code: risk.code, statement });
            }
        }

        if (hasDeleteWithoutWhere(normalizedStatement)) {
            findings.push({
                code: 'MIGRATION_RISK_DELETE_WITHOUT_WHERE',
                statement,
            });
        }
    }

    return findings;
}
