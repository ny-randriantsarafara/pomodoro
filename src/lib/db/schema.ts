import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    integer,
    pgEnum,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// Auth.js tables

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    image: text('image'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
    'accounts',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: varchar('type', { length: 255 })
            .$type<AdapterAccountType>()
            .notNull(),
        provider: varchar('provider', { length: 255 }).notNull(),
        providerAccountId: varchar('provider_account_id', {
            length: 255,
        }).notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: varchar('token_type', { length: 255 }),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (account) => [
        {
            compositePk: primaryKey({
                columns: [account.provider, account.providerAccountId],
            }),
        },
    ]
);

export const authSessions = pgTable('auth_sessions', {
    sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
    'verification_tokens',
    {
        identifier: varchar('identifier', { length: 255 }).notNull(),
        token: varchar('token', { length: 255 }).notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (vt) => [
        {
            compositePk: primaryKey({
                columns: [vt.identifier, vt.token],
            }),
        },
    ]
);

// Domain enums

export const focusModeEnum = pgEnum('focus_mode', ['short', 'average', 'deep']);

export const sessionStatusEnum = pgEnum('session_status', [
    'completed',
    'interrupted',
    'abandoned',
]);

// Domain tables

export const projects = pgTable(
    'projects',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 100 }).notNull(),
        description: text('description'),
        githubRepoUrl: text('github_repo_url'),
        githubOwner: varchar('github_owner', { length: 255 }),
        githubRepoName: varchar('github_repo_name', { length: 255 }),
        color: varchar('color', { length: 7 }).notNull().default('#A0A0FF'),
        createdAt: timestamp('created_at', { mode: 'date' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex('projects_user_name_idx').on(table.userId, table.name),
    ]
);

export const focusSessions = pgTable('focus_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    focusMode: focusModeEnum('focus_mode').notNull(),
    task: text('task').notNull(),
    startedAt: timestamp('started_at', { mode: 'date' }).notNull(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    status: sessionStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const sessionProjects = pgTable(
    'session_projects',
    {
        sessionId: uuid('session_id')
            .notNull()
            .references(() => focusSessions.id, { onDelete: 'cascade' }),
        projectId: uuid('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade' }),
    },
    (table) => [
        {
            compositePk: primaryKey({
                columns: [table.sessionId, table.projectId],
            }),
        },
    ]
);

export type SessionProject = typeof sessionProjects.$inferSelect;

export const githubConnections = pgTable('github_connections', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).notNull(),
    githubUsername: varchar('github_username', { length: 255 }).notNull(),
    accessToken: text('access_token').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Type exports

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type GithubConnection = typeof githubConnections.$inferSelect;
export type FocusMode = 'short' | 'average' | 'deep';
export type SessionStatus = 'completed' | 'interrupted' | 'abandoned';
