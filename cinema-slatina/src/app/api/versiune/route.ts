/*
 * Versiunea site-ului (commit-ul publicat). Se calculează o dată, la build, și
 * se servește din CDN, deci nu costă nimic. Televizoarele o întreabă din când
 * în când și se reîncarcă singure când se schimbă (vezi `watchNewVersion`).
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ v: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local" });
}
