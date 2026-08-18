/** 1250 bani -> "12,50 lei" */
export function formatPrice(bani: number): string {
  return `${(bani / 100).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} lei`;
}

/** "0784010929" -> "0784 010 929" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/** Normalizeaza un numar romanesc la forma 07XXXXXXXX. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let n = digits;
  if (n.startsWith("+40")) n = "0" + n.slice(3);
  else if (n.startsWith("0040")) n = "0" + n.slice(4);
  else if (n.startsWith("40") && n.length === 11) n = "0" + n.slice(2);
  if (/^07\d{8}$/.test(n)) return n;
  return null;
}

/** "0784010929" -> "0784 *** 929" (pentru afisare publica) */
export function maskPhone(phone: string): string {
  const n = phone.replace(/\D/g, "");
  if (n.length < 7) return phone;
  return `${n.slice(0, 4)} *** ${n.slice(-3)}`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ăâ]/gi, "a")
    .replace(/[îí]/gi, "i")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function minutesToDuration(min?: number | null): string | null {
  if (!min) return null;
  return `${min} min`;
}

/** Extrage ID-ul YouTube dintr-un link de trailer. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

/** Extrage ID-ul IMDb (tt…) dintr-un link sau text. */
export function extractImdbId(input: string): string | null {
  const m = input.match(/tt\d{7,9}/);
  return m ? m[0] : null;
}

/** Extrage ID-ul TMDB dintr-un link de themoviedb.org. */
export function extractTmdbId(input: string): number | null {
  const m = input.match(/themoviedb\.org\/movie\/(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** Ce fel de link de film a introdus utilizatorul. */
export function detectMovieLink(
  input: string,
): { source: "imdb"; id: string } | { source: "tmdb"; id: number } | null {
  const imdb = extractImdbId(input);
  if (imdb) return { source: "imdb", id: imdb };
  const tmdb = extractTmdbId(input);
  if (tmdb) return { source: "tmdb", id: tmdb };
  return null;
}
