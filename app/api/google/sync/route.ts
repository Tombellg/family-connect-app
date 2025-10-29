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

type GoogleResource = "calendar" | "tasks";

type GoogleErrorDetails = {
  statusCode?: number;
  reason?: string;
  message: string;
  description?: string;
};

type RecordedError = {
  scope: GoogleResource | "auth";
  details: GoogleErrorDetails;
  suggestion?: string;
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

function extractGoogleErrorDetails(error: unknown): GoogleErrorDetails {
  const fallbackMessage =
    (error instanceof Error && error.message) || "Erreur Google inattendue";

  if (!error || typeof error !== "object") {
    return { message: fallbackMessage };
  }

  const maybeError = error as {
    code?: number;
    status?: number;
    response?: {
      status?: number;
      data?: {
        error?: {
          code?: number;
          message?: string;
          status?: string;
          errors?: Array<{ message?: string; reason?: string }>;
        };
      };
    };
    message?: string;
  };

  const statusCode =
    maybeError.response?.status ?? maybeError.code ?? maybeError.status;

  const responseError = maybeError.response?.data?.error;

  const descriptionParts: string[] = [];
  if (responseError?.errors?.length) {
    for (const item of responseError.errors) {
      if (item?.message) {
        descriptionParts.push(item.message);
      }
    }
  }

  if (maybeError.message) {
    descriptionParts.push(maybeError.message);
  }

  return {
    statusCode,
    reason: responseError?.status,
    message: responseError?.message ?? fallbackMessage,
    description: descriptionParts.length ? descriptionParts.join(" | ") : undefined
  };
}

function buildSuggestion(resource: GoogleResource | "auth", details: GoogleErrorDetails) {
  const message = details.message.toLowerCase();
  const description = details.description?.toLowerCase() ?? "";

  if (resource === "auth" && details.statusCode === 401) {
    return "Reconnectez-vous à Google pour renouveler votre autorisation.";
  }

  if (
    details.statusCode === 403 &&
    (message.includes("insufficient") || description.includes("insufficient"))
  ) {
    return "Vérifiez les autorisations OAuth (scopes) et reconnectez-vous à Google.";
  }

  if (
    details.statusCode === 403 &&
    (message.includes("not been used") || description.includes("accessnotconfigured"))
  ) {
    return `Activez l'API Google ${
      resource === "calendar" ? "Calendar" : "Tasks"
    } dans Google Cloud Console.`;
  }

  if (resource === "auth" && details.statusCode === 400) {
    return "Revérifiez le refresh token Google et relancez l'authentification.";
  }

  if (message.includes("invalid grant")) {
    return "Le token n'est plus valide. Déconnectez-vous puis reconnectez-vous à Google.";
  }

  return undefined;
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

  let refreshAttempted = false;
  const recordedErrors: RecordedError[] = [];

  const recordError = (scope: RecordedError["scope"], error: unknown) => {
    const details = extractGoogleErrorDetails(error);
    const suggestion = buildSuggestion(scope, details);

    console.error("Erreur Google", {
      scope,
      statusCode: details.statusCode,
      reason: details.reason,
      message: details.message,
      description: details.description,
      raw: error
    });

    recordedErrors.push({ scope, details, suggestion });
  };

  async function attemptFetch<T>(
    scope: GoogleResource,
    fetcher: (tokens: { accessToken: string; refreshToken?: string }) => Promise<T>
  ) {
    let error: unknown;
    try {
      return await fetcher(tokens);
    } catch (err) {
      error = err;
    }

    if (
      error &&
      isAuthorizationError(error) &&
      tokens.refreshToken &&
      !refreshAttempted
    ) {
      refreshAttempted = true;
      try {
        const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
        tokens = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? tokens.refreshToken
        };

        return await fetcher(tokens);
      } catch (refreshError) {
        recordError("auth", refreshError);
        error = error ?? refreshError;
      }
    }

    if (error) {
      recordError(scope, error);
    }

    return null;
  }

  const [events, tasks] = await Promise.all([
    attemptFetch("calendar", fetchCalendarEvents),
    attemptFetch("tasks", fetchGoogleTasks)
  ]);

  const successfulEvents = events ?? [];
  const successfulTasks = tasks ?? [];

  if (!recordedErrors.length) {
    return NextResponse.json({ events: successfulEvents, tasks: successfulTasks });
  }

  const resourceErrorCount = recordedErrors.filter(
    (error) => error.scope !== "auth"
  ).length;

  const status =
    resourceErrorCount === 2
      ? 502
      : resourceErrorCount === 1
      ? 207
      : 401;

  return NextResponse.json(
    {
      events: successfulEvents,
      tasks: successfulTasks,
      errors: recordedErrors.map(({ scope, details, suggestion }) => ({
        scope,
        message: details.message,
        statusCode: details.statusCode,
        reason: details.reason,
        description: details.description,
        suggestion
      }))
    },
    { status }
  );
}
