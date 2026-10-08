import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { PROGRAM_TAG } from "@/server/queries";
import { TRAILER_JOBS_TAG } from "@/lib/constants";

/*
 * Legătura agentului de trailere (calculatorul lui Teo) cu site-ul.
 *
 * GET: cererile „Pune trailerele” care așteaptă. Răspunsul vine dintr-o copie
 * păstrată de Vercel, golită doar când adminul apasă butonul, așa că agentul
 * poate întreba des fără să trezească baza de date (care, gratuită, are voie
 * să stea pornită doar câteva ore pe zi).
 *
 * POST: agentul a legat trailere noi de filme; golim copia programului ca
 * televizoarele să le ia imediat. Cel mult o dată pe minut.
 */

const pendingJobs = unstable_cache(
  async () =>
    (
      await db.trailerJob.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    ).map((j) => j.id),
  ["trailer-jobs-pending"],
  { revalidate: 6 * 3600, tags: [TRAILER_JOBS_TAG] },
);

export async function GET() {
  return Response.json({ pending: await pendingJobs() });
}

let lastRefresh = 0;

export async function POST() {
  if (Date.now() - lastRefresh < 60_000) return Response.json({ ok: true, throttled: true });
  lastRefresh = Date.now();
  revalidateTag(PROGRAM_TAG, { expire: 0 });
  revalidateTag(TRAILER_JOBS_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
