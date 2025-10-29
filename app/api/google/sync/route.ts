import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchCalendarEvents,
  fetchGoogleTasks,
  refreshGoogleAccessToken
} from "@/lib/google";

type GoogleSession = Session & {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

function isAuthorizationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: number;
    status?: number;
    response?: { status?: number };
    message?: string;
  };

  const statusCode = maybeError.code ?? maybeError.status ?? maybeError.response?.status;
  if (typeof statusCode === "number" && [401, 403].includes(statusCode)) {
    return true;
  }

  if (typeof maybeError.message === "string") {
    const message = maybeError.message.toLowerCase();
    return message.includes("invalid grant") || message.includes("unauthorized");
  }

  return false;
}

async function fetchGoogleResources(tokens: {
  accessToken: string;
  refreshToken?: string;
}) {
  return Promise.all([fetchCalendarEvents(tokens), fetchGoogleTasks(tokens)]);
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as GoogleSession | null;

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let tokens = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken
  };

  try {
    const [events, tasks] = await fetchGoogleResources(tokens);
    return NextResponse.json({ events, tasks });
  } catch (error) {
    if (isAuthorizationError(error) && tokens.refreshToken) {
      try {
        const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
        tokens = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? tokens.refreshToken
        };

        const [events, tasks] = await fetchGoogleResources(tokens);
        return NextResponse.json({ events, tasks });
      } catch (refreshError) {
        console.error("Échec du rafraîchissement du token Google", refreshError);
      }
    }

    console.error("Erreur de synchronisation Google", error);
    return NextResponse.json(
      { error: "Impossible de synchroniser les données Google" },
      { status: 500 }
    );
  }
}
