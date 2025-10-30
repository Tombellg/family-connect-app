import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import type { calendar_v3 } from "googleapis";
import { authOptions } from "@/lib/auth";
import {
  formatCalendarEvent,
  getGoogleCalendarClient,
  refreshGoogleAccessToken,
  type FormattedCalendarEvent,
  type GoogleTokenBundle,
} from "@/lib/google";

interface GoogleSession extends Session {
  accessToken?: string;
  refreshToken?: string;
}

function isAuthorizationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    status?: number;
    code?: number;
    response?: { status?: number };
    message?: string;
  };

  const statusCode = maybeError.status ?? maybeError.code ?? maybeError.response?.status;
  if (typeof statusCode === "number" && [401, 403].includes(statusCode)) {
    return true;
  }

  if (typeof maybeError.message === "string") {
    const message = maybeError.message.toLowerCase();
    return message.includes("invalid grant") || message.includes("unauthorized");
  }

  return false;
}

async function getTokens() {
  const session = (await getServerSession(authOptions)) as GoogleSession | null;
  if (!session?.accessToken) {
    return null;
  }
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  } satisfies GoogleTokenBundle;
}

type ValidatedPayload = {
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  start: calendar_v3.Schema$EventDateTime;
  end: calendar_v3.Schema$EventDateTime;
};

function validatePayload(payload: unknown): ValidatedPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload invalide");
  }

  const { summary, description, location, allDay, startIso, endIso, startDate, endDate, timeZone } =
    payload as {
      summary?: string;
      description?: string;
      location?: string;
      allDay?: boolean;
      startIso?: string;
      endIso?: string;
      startDate?: string;
      endDate?: string;
      timeZone?: string;
    };

  if (!summary || typeof summary !== "string") {
    throw new Error("Un titre est requis pour créer l'évènement");
  }

  if (allDay) {
    if (!startDate || !endDate) {
      throw new Error("Les dates de début et de fin sont requises pour un évènement sur la journée");
    }
    return {
      summary,
      description: description ?? undefined,
      location: location ?? undefined,
      timeZone: timeZone ?? undefined,
      start: { date: startDate, timeZone },
      end: { date: endDate, timeZone },
    } satisfies ValidatedPayload;
  }

  if (!startIso || !endIso) {
    throw new Error("Les horodatages de début et de fin sont obligatoires");
  }

  return {
    summary,
    description: description ?? undefined,
    location: location ?? undefined,
    timeZone: timeZone ?? undefined,
    start: { dateTime: startIso, timeZone },
    end: { dateTime: endIso, timeZone },
  } satisfies ValidatedPayload;
}

async function runEventMutation(
  tokens: GoogleTokenBundle,
  callback: (client: ReturnType<typeof getGoogleCalendarClient>) => Promise<FormattedCalendarEvent>,
) {
  let currentTokens = tokens;
  let refreshAttempted = false;

  const execute = async () => {
    const client = getGoogleCalendarClient(currentTokens);
    return callback(client);
  };

  try {
    return await execute();
  } catch (error) {
    if (isAuthorizationError(error) && currentTokens.refreshToken && !refreshAttempted) {
      refreshAttempted = true;
      const refreshed = await refreshGoogleAccessToken(currentTokens.refreshToken);
      currentTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? currentTokens.refreshToken,
      };
      return await execute();
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json(
      { message: "Session Google invalide. Reconnectez-vous pour créer un évènement." },
      { status: 401 },
    );
  }

  let payload: ValidatedPayload;
  try {
    payload = validatePayload(await request.json());
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }

  try {
    const event = await runEventMutation(tokens, async (client) => {
      const response = await client.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: payload.summary,
          description: payload.description,
          location: payload.location,
          start: payload.start,
          end: payload.end,
        },
      });

      const data = response?.data;
      if (!data) {
        throw new Error("Réponse inattendue de Google Calendar");
      }

      return formatCalendarEvent(data);
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible d'enregistrer l'évènement Google Calendar";
    return NextResponse.json({ message }, { status: 500 });
  }
}
