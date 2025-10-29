import { randomUUID } from "crypto";
import { google } from "googleapis";

export type GoogleTokenBundle = {
  accessToken: string;
  refreshToken?: string;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks"
];

function getOAuthClient(tokens: GoogleTokenBundle) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
  });
  return client;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error("Échec du rafraîchissement du token Google");
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    refreshToken: payload.refresh_token
  };
}

export function getGoogleAuthorizationUrl(redirectUri: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  return client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent"
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Date inconnue";
  }
  const date = new Date(value);
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export async function fetchCalendarEvents(tokens: GoogleTokenBundle) {
  const client = getOAuthClient(tokens);
  const calendar = google.calendar({ version: "v3", auth: client });
  const now = new Date();

  const { data } = await calendar.events.list({
    calendarId: "primary",
    maxResults: 10,
    orderBy: "startTime",
    singleEvents: true,
    timeMin: now.toISOString()
  });

  return (
    data.items?.map((event) => ({
      id: event.id ?? randomUUID(),
      summary: event.summary ?? "Sans titre",
      start: formatDate(event.start?.dateTime ?? event.start?.date ?? undefined),
      end: formatDate(event.end?.dateTime ?? event.end?.date ?? undefined)
    })) ?? []
  );
}

export async function fetchGoogleTasks(tokens: GoogleTokenBundle) {
  const client = getOAuthClient(tokens);
  const tasks = google.tasks({ version: "v1", auth: client });

  const { data } = await tasks.tasks.list({
    tasklist: "@default",
    maxResults: 20,
    showCompleted: true
  });

  return (
    data.items?.map((task) => ({
      id: task.id ?? randomUUID(),
      title: task.title ?? "Sans titre",
      status: task.status ?? "inconnue",
      due: task.due ? formatDate(task.due) : undefined
    })) ?? []
  );
}
