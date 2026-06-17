import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { getPool } from "@/lib/db";

/**
 * Auth.js (NextAuth v5) configuration.
 * - Google OAuth  → reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
 * - Email magic link via Resend → reads AUTH_RESEND_KEY, sends from AUTH_EMAIL_FROM
 * - Sessions + accounts persisted in Postgres via @auth/pg-adapter (shared pool)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(getPool()),
  providers: [
    Google,
    Resend({ from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev" }),
  ],
  session: { strategy: "database" },
  callbacks: {
    // expose the user id on the session so the app can attribute comments
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
