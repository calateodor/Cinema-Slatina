/*
 * Versiunea site-ului (commit-ul publicat). Se calculează o dată, la build, și
 * se servește din CDN, deci nu costă nimic. Televizoarele o întreabă din când
 * în când și se reîncarcă singure când se schimbă (vezi `watchNewVersion`).
 */
export const dynamic = "force-static";

export function GET() {
  // aceeași valoare e scrisă și în pagini (next.config.ts, `env`)
  return Response.json({ v: process.env.PAGE_VERSION ?? "local" });
}
