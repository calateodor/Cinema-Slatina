import "server-only";
import {
  issueSignedToken,
  presignUrl,
  type IssuedSignedToken,
} from "@vercel/blob";

/*
 * Trailerele televizoarelor stau într-un Vercel Blob **privat**: un fișier nu
 * se poate deschide fără semnătură. Serverul semnează, la cerere, un link de
 * citire valabil câteva zile, pe care televizorul îl redă direct.
 *
 * Tokenul de semnare se ține în memorie și se refolosește: cu același token,
 * linkul unui fișier iese identic, deci pagina care se reîmprospătează în
 * fiecare minut nu schimbă sursa clipului și nu-l repornește.
 */

const TOKEN_LIFE_MS = 72 * 3600_000;
/** Tokenul se reînnoiește când mai are sub atât (paginile se reîncarcă la 12 ore). */
const RENEW_BEFORE_MS = 24 * 3600_000;

let cached: { token: IssuedSignedToken; validUntil: number } | null = null;
let pending: Promise<IssuedSignedToken | null> | null = null;

async function signingToken(): Promise<IssuedSignedToken | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  if (cached && cached.validUntil - Date.now() > RENEW_BEFORE_MS)
    return cached.token;
  pending ??= (async () => {
    try {
      const validUntil = Date.now() + TOKEN_LIFE_MS;
      const token = await issueSignedToken({
        pathname: "*",
        operations: ["get"],
        validUntil,
      });
      cached = { token, validUntil };
      return token;
    } catch (error) {
      console.error("[trailere] nu pot emite tokenul de semnare:", error);
      return cached?.token ?? null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/**
 * Linkul semnat pentru un fișier din Blob (după URL-ul lui privat), sau `null`
 * dacă nu se poate semna: atunci televizorul folosește YouTube.
 */
export async function signedTrailerUrl(
  blobUrl: string,
): Promise<string | null> {
  try {
    const token = await signingToken();
    if (!token) return null;
    const pathname = decodeURIComponent(
      new URL(blobUrl).pathname.replace(/^\//, ""),
    );
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
    });
    return presignedUrl;
  } catch (error) {
    console.error("[trailere] nu pot semna", blobUrl, error);
    return null;
  }
}
