import PostgresAdapter from "@auth/pg-adapter";
import GoogleProvider from "next-auth/providers/google";
import type { Session } from "next-auth";
import { dbReady, pool } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/google";

type NextAuthParameters = Parameters<typeof import("next-auth/next").default>;
type NextAuthOptions = Extract<NextAuthParameters, [any, any, any]> extends [any, any, infer O]
  ? O
  : never;

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks"
];

void dbReady;

const authSecret =
  process.env.NEXTAUTH_SECRET ?? process.env.STACK_SECRET_SERVER_KEY;

if (!authSecret) {
  throw new Error(
    "NEXTAUTH_SECRET ou STACK_SECRET_SERVER_KEY doit être défini pour Auth.js"
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(pool),
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
        const expiresIn = account.expires_in ?? 3600;
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + Number(expiresIn) * 1000;
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
      const mutableSession = session as Session & {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      };

      mutableSession.accessToken = token.accessToken as string | undefined;
      mutableSession.refreshToken = token.refreshToken as string | undefined;
      mutableSession.expiresAt = token.expiresAt as number | undefined;
      return session;
    }
  },
  pages: {
    signIn: "/"
  },
  secret: authSecret
};
