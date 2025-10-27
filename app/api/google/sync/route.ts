import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCalendarEvents, fetchGoogleTasks } from "@/lib/google";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const tokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };

    const [events, tasks] = await Promise.all([
      fetchCalendarEvents(tokens),
      fetchGoogleTasks(tokens)
    ]);

    return NextResponse.json({ events, tasks });
  } catch (error) {
    console.error("Erreur de synchronisation Google", error);
    return NextResponse.json(
      { error: "Impossible de synchroniser les données Google" },
      { status: 500 }
    );
  }
}
