import { PgAdapter } from "@auth/pg-adapter";
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { pool } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/google";

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly"
];

export const authOptions: AuthOptions = {
  adapter: PgAdapter(pool),
  session: {
    strategy: "jwt"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: scopes.join(" ")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + (account.expires_in ?? 3600) * 1000;
        return token;
      }

      if (token.expiresAt && Date.now() < (token.expiresAt as number) - 60_000) {
        return token;
      }

      const refreshToken = token.refreshToken as string | undefined;
      if (!refreshToken) {
        return token;
      }

      try {
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        token.accessToken = refreshed.accessToken;
        token.expiresAt = refreshed.expiresAt;
        if (refreshed.refreshToken) {
          token.refreshToken = refreshed.refreshToken;
        }
      } catch (error) {
        console.error("Échec du rafraîchissement du token Google", error);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      session.expiresAt = token.expiresAt as number | undefined;
      return session;
    }
  },
  pages: {
    signIn: "/"
  },
  secret: process.env.NEXTAUTH_SECRET
};
