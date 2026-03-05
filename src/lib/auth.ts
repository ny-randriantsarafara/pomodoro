import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import {
    users,
    accounts,
    authSessions,
    verificationTokens,
} from '@/lib/db/schema';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
        } & DefaultSession['user'];
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: authSessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: [
        GitHub({ allowDangerousEmailAccountLinking: true }),
        Google({ allowDangerousEmailAccountLinking: true }),
    ],
    pages: {
        signIn: '/sign-in',
    },
    callbacks: {
        session({ session, user }) {
            session.user.id = user.id;
            return session;
        },
    },
});
