import { randomUUID } from "crypto";
import { google } from "googleapis";
import type { tasks_v1 } from "googleapis";

const GOOGLE_TASK_COLORS: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6c026",
  "6": "#f5511d",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d60000"
};

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

export function getGoogleTasksClient(tokens: GoogleTokenBundle) {
  return google.tasks({ version: "v1", auth: getOAuthClient(tokens) });
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

function resolveTaskListColor(color?: string, colorId?: string) {
  if (color) {
    return color;
  }

  if (colorId && GOOGLE_TASK_COLORS[colorId]) {
    return GOOGLE_TASK_COLORS[colorId];
  }

  return undefined;
}

export type FormattedCalendarEvent = {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  start: {
    label: string;
    iso: string | null;
  };
  end: {
    label: string;
    iso: string | null;
  };
  organizer?: string;
};

export async function fetchCalendarEvents(tokens: GoogleTokenBundle): Promise<FormattedCalendarEvent[]> {
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
    data.items?.map((event) => {
      const startDate = event.start?.dateTime ?? event.start?.date ?? null;
      const endDate = event.end?.dateTime ?? event.end?.date ?? null;
      const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

      return {
        id: event.id ?? randomUUID(),
        summary: event.summary ?? "Sans titre",
        location: event.location ?? undefined,
        description: event.description ?? undefined,
        isAllDay,
        start: {
          label: formatDate(startDate),
          iso: startDate
        },
        end: {
          label: formatDate(endDate),
          iso: endDate
        },
        organizer: event.organizer?.displayName ?? event.organizer?.email ?? undefined
      } satisfies FormattedCalendarEvent;
    }) ?? []
  );
}

export type FormattedTask = {
  id: string;
  title: string;
  status: string;
  due?: {
    label: string;
    iso: string;
  };
  notes?: string;
  updated?: string;
  recurrence?: string[];
  webLink?: string;
};

export type FormattedTaskList = {
  id: string;
  title: string;
  updated?: string;
  color?: string;
  kind?: string;
  tasks: FormattedTask[];
};

function parseDueDate(input?: string | null) {
  if (!input) {
    return undefined;
  }

  return {
    iso: input,
    label: formatDate(input)
  };
}

export function formatGoogleTask(task: tasks_v1.Schema$Task): FormattedTask {
  const extendedTask = task as tasks_v1.Schema$Task & { recurrence?: string[] };

  return {
    id: task.id ?? randomUUID(),
    title: task.title ?? "Sans titre",
    status: task.status ?? "needsAction",
    due: parseDueDate(task.due ?? undefined),
    notes: task.notes ?? undefined,
    updated: task.updated ?? undefined,
    recurrence: extendedTask.recurrence ?? undefined,
    webLink: task.links?.find((link) => link.type === "email")?.link
  } satisfies FormattedTask;
}

export async function fetchGoogleTasks(tokens: GoogleTokenBundle): Promise<FormattedTaskList[]> {
  const client = getOAuthClient(tokens);
  const tasks = google.tasks({ version: "v1", auth: client });

  const { data } = await tasks.tasklists.list({
    maxResults: 100
  });

  const lists = data.items ?? [];

  if (!lists.length) {
    return [];
  }

  const detailedLists = await Promise.all(
    lists.map(async (list) => {
      const enhancedList = list as tasks_v1.Schema$TaskList & { color?: string; colorId?: string };
      try {
        const { data: taskData } = await tasks.tasks.list({
          tasklist: list.id ?? "@default",
          maxResults: 200,
          showCompleted: true,
          showHidden: true
        });

        const formattedTasks: FormattedTask[] =
          taskData.items?.map((task) => formatGoogleTask(task)) ?? [];

        return {
          id: list.id ?? randomUUID(),
          title: list.title ?? "Sans titre",
          updated: list.updated ?? undefined,
          color: resolveTaskListColor(enhancedList.color ?? undefined, enhancedList.colorId ?? undefined),
          kind: list.kind ?? undefined,
          tasks: formattedTasks
        } satisfies FormattedTaskList;
      } catch (error) {
        console.error("Erreur lors de la récupération des tâches d'une liste", {
          listId: list.id,
          error
        });
        return {
          id: list.id ?? randomUUID(),
          title: list.title ?? "Sans titre",
          updated: list.updated ?? undefined,
          color: resolveTaskListColor(enhancedList.color ?? undefined, enhancedList.colorId ?? undefined),
          kind: list.kind ?? undefined,
          tasks: []
        } satisfies FormattedTaskList;
      }
    })
  );

  return detailedLists.sort((a, b) => {
    if (!a.updated && !b.updated) {
      return a.title.localeCompare(b.title);
    }
    if (!a.updated) {
      return 1;
    }
    if (!b.updated) {
      return -1;
    }
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}
