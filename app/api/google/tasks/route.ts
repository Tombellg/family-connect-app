import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import type { tasks_v1 } from "googleapis";
import { authOptions } from "@/lib/auth";
import {
  formatGoogleTask,
  getGoogleTasksClient,
  refreshGoogleAccessToken,
  type FormattedTask,
  type GoogleTokenBundle
} from "@/lib/google";

interface GoogleSession extends Session {
  accessToken?: string;
  refreshToken?: string;
}

type BaseTaskPayload = {
  listId: string;
  title?: string;
  notes?: string | null;
  due?: string | null;
  recurrence?: string[] | null;
  status?: "needsAction" | "completed";
};

type CreateTaskPayload = BaseTaskPayload & {
  title: string;
};

type UpdateTaskPayload = BaseTaskPayload & {
  taskId: string;
};

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
    refreshToken: session.refreshToken
  } satisfies GoogleTokenBundle;
}

type TaskMutationResult = {
  task: FormattedTask;
};

async function runTaskMutation(
  tokens: GoogleTokenBundle,
  callback: (client: ReturnType<typeof getGoogleTasksClient>) => Promise<FormattedTask>
) {
  let currentTokens = tokens;
  let refreshAttempted = false;

  const execute = async () => {
    const client = getGoogleTasksClient(currentTokens);
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
        refreshToken: refreshed.refreshToken ?? currentTokens.refreshToken
      };
      return await execute();
    }

    throw error;
  }
}

function validateCreatePayload(payload: unknown): CreateTaskPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload invalide pour la création de tâche");
  }

  const { listId, title, notes, due, recurrence, status } = payload as CreateTaskPayload;

  if (!listId || typeof listId !== "string") {
    throw new Error("Identifiant de liste requis");
  }

  if (!title || typeof title !== "string") {
    throw new Error("Titre de la tâche requis");
  }

  return {
    listId,
    title,
    notes: notes ?? null,
    due: due ?? null,
    recurrence: recurrence ?? null,
    status: status ?? "needsAction"
  };
}

function validateUpdatePayload(payload: unknown): UpdateTaskPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload invalide pour la mise à jour de tâche");
  }

  const { listId, taskId, title, notes, due, recurrence, status } = payload as UpdateTaskPayload;

  if (!listId || typeof listId !== "string") {
    throw new Error("Identifiant de liste requis");
  }

  if (!taskId || typeof taskId !== "string") {
    throw new Error("Identifiant de tâche requis");
  }

  return {
    listId,
    taskId,
    title,
    notes: notes ?? null,
    due: due ?? null,
    recurrence: recurrence ?? null,
    status: status ?? undefined
  };
}

export async function POST(request: Request) {
  const tokens = await getTokens();

  if (!tokens) {
    return NextResponse.json(
      {
        message: "Session Google invalide. Reconnectez-vous pour créer une tâche."
      },
      { status: 401 }
    );
  }

  let payload: CreateTaskPayload;

  try {
    payload = validateCreatePayload(await request.json());
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }

  try {
    const task = await runTaskMutation(tokens, async (client) => {
      const requestBody = {
        title: payload.title,
        notes: payload.notes ?? undefined,
        due: payload.due ?? undefined,
        recurrence: payload.recurrence ?? undefined,
        status: payload.status
      } as tasks_v1.Schema$Task & { recurrence?: string[] };

      const rawResponse = await client.tasks.insert({
        tasklist: payload.listId,
        requestBody
      });

      const data =
        rawResponse && typeof rawResponse === "object" && "data" in rawResponse
          ? (rawResponse as { data?: tasks_v1.Schema$Task }).data
          : undefined;

      if (!data) {
        throw new Error("Réponse inattendue de l'API Google Tasks lors de la création");
      }

      return formatGoogleTask(data);
    });

    return NextResponse.json({ task } satisfies TaskMutationResult, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création d'une tâche", error);
    return NextResponse.json(
      {
        message:
          "Impossible de créer la tâche. Vérifiez vos autorisations Google Tasks et réessayez."
      },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request) {
  const tokens = await getTokens();

  if (!tokens) {
    return NextResponse.json(
      {
        message: "Session Google invalide. Reconnectez-vous pour modifier une tâche."
      },
      { status: 401 }
    );
  }

  let payload: UpdateTaskPayload;

  try {
    payload = validateUpdatePayload(await request.json());
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }

  try {
    const task = await runTaskMutation(tokens, async (client) => {
      const requestBody = {
        title: payload.title ?? undefined,
        notes: payload.notes ?? undefined,
        due: payload.due ?? undefined,
        recurrence: payload.recurrence ?? undefined,
        status: payload.status ?? undefined
      } as tasks_v1.Schema$Task & { recurrence?: string[] };

      const rawResponse = await client.tasks.patch({
        tasklist: payload.listId,
        task: payload.taskId,
        requestBody
      });

      const data =
        rawResponse && typeof rawResponse === "object" && "data" in rawResponse
          ? (rawResponse as { data?: tasks_v1.Schema$Task }).data
          : undefined;

      if (!data) {
        throw new Error("Réponse inattendue de l'API Google Tasks lors de la mise à jour");
      }

      return formatGoogleTask(data);
    });

    return NextResponse.json({ task } satisfies TaskMutationResult, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la mise à jour d'une tâche", error);
    return NextResponse.json(
      {
        message:
          "Impossible de mettre à jour la tâche. Vérifiez vos autorisations Google Tasks et réessayez."
      },
      { status: 502 }
    );
  }
}

