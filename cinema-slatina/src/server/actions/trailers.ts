"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { todayStart } from "@/lib/dates";
import { youtubeId } from "@/lib/format";

/*
 * „Pune trailerele”: administrarea doar scrie o cerere în baza de date.
 * Agentul de pe calculatorul lui Teo (D:\Cinema\LiveUpdates) o preia, trage
 * clipurile de pe YouTube, le urcă în Vercel Blob și le leagă de filme.
 * Agentul lasă la câteva secunde un semn de viață în Setting.
 */

const HEARTBEAT_KEY = "trailer_agent";
/** Peste atât fără semn de viață, agentul e considerat oprit. */
const ONLINE_WITHIN_MS = 60_000;

export type TrailerMovieState = "pus" | "lipsa" | "fara-link";

export type TrailerStatus = {
  agent: { online: boolean; lastSeen: string | null; host: string | null; working: boolean };
  job: {
    id: string;
    status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
    createdAt: string;
    finishedAt: string | null;
    summary: string | null;
    log: string[];
  } | null;
  movies: { title: string; state: TrailerMovieState }[];
};

export async function getTrailerStatus(): Promise<TrailerStatus> {
  await requireAdmin();
  const [beat, job, movies] = await Promise.all([
    db.setting.findUnique({ where: { key: HEARTBEAT_KEY } }),
    db.trailerJob.findFirst({ orderBy: { createdAt: "desc" } }),
    // filmele cu proiecții de azi încolo, inclusiv săptămâna pregătită
    db.movie.findMany({
      where: {
        isArchived: false,
        screenings: { some: { startsAt: { gte: todayStart() }, isCancelled: false } },
      },
      select: { title: true, trailerUrl: true, trailerFileUrl: true, trailerFileSource: true },
      orderBy: { title: "asc" },
    }),
  ]);

  let host: string | null = null;
  let working = false;
  try {
    const value = JSON.parse(beat?.value ?? "null") as { host?: string; state?: string } | null;
    host = value?.host ?? null;
    working = value?.state === "lucrează";
  } catch {
    // valoare stricată: tratăm agentul ca necunoscut
  }
  const lastSeen = beat?.updatedAt ?? null;

  return {
    agent: {
      online: Boolean(lastSeen && Date.now() - lastSeen.getTime() < ONLINE_WITHIN_MS),
      lastSeen: lastSeen?.toISOString() ?? null,
      host,
      working,
    },
    job: job
      ? {
          id: job.id,
          status: job.status as "PENDING" | "RUNNING" | "DONE" | "FAILED",
          createdAt: job.createdAt.toISOString(),
          finishedAt: job.finishedAt?.toISOString() ?? null,
          summary: job.summary,
          log: job.log.split("\n").filter(Boolean).slice(-60),
        }
      : null,
    movies: movies.map((m) => ({
      title: m.title,
      state: !youtubeId(m.trailerUrl)
        ? "fara-link"
        : m.trailerFileUrl && m.trailerFileSource === m.trailerUrl
          ? "pus"
          : "lipsa",
    })),
  };
}

export async function requestTrailers(): Promise<{ ok: boolean; message: string }> {
  const user = await requireAdmin();
  const open = await db.trailerJob.findFirst({ where: { status: { in: ["PENDING", "RUNNING"] } } });
  if (open) return { ok: true, message: "Există deja o cerere în lucru." };
  await db.trailerJob.create({ data: { requestedById: user.id } });
  await db.auditLog.create({ data: { userId: user.id, action: "request", entity: "trailers" } });
  return { ok: true, message: "Cererea a fost trimisă calculatorului de trailere." };
}
