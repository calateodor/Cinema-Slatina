/*
 * Ora serverului, pentru televizoare. Ceasul cutiilor TV nu e de încredere:
 * pe 20 octombrie 2026 cutia de la casierie era cu o oră în urmă, iar ceasul
 * și numărătorile „Începe în” arătau greșit. Televizoarele întreabă ora de aici
 * și își corectează ceasul (vezi `components/display/tv-clock.ts`).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ t: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
