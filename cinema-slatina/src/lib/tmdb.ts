import "server-only";
import { extractImdbId } from "@/lib/format";

const TMDB = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";

export type MovieMetadata = {
  imdbId: string;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  synopsis: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string | null;
  runtimeMin: number | null;
  releaseYear: number | null;
  imdbRating: number | null;
  director: string | null;
  cast: string | null;
};

function key(): string | null {
  const value = process.env.TMDB_API_KEY;
  return value && value.trim() ? value.trim() : null;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}) {
  const apiKey = key();
  if (!apiKey) throw new Error("TMDB_API_KEY nu este configurat în .env");

  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!res.ok) {
    throw new Error(`TMDB a răspuns cu ${res.status} pentru ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * Preia metadatele unui film pornind de la un link (sau ID) de IMDb.
 * Descrierea si titlul sunt cerute in romana; daca TMDB nu are traducere,
 * se face fallback pe engleza.
 */
export async function fetchMovieByImdb(input: string): Promise<MovieMetadata> {
  const imdbId = extractImdbId(input);
  if (!imdbId) {
    throw new Error(
      "Link-ul nu conține un ID de IMDb valid (ex. https://www.imdb.com/title/tt1234567/)",
    );
  }

  const found = await tmdbFetch<{ movie_results: { id: number }[] }>(
    `/find/${imdbId}`,
    { external_source: "imdb_id" },
  );
  const hit = found.movie_results?.[0];
  if (!hit) {
    throw new Error(`Filmul ${imdbId} nu a fost găsit în baza TMDB.`);
  }

  type Detail = {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    runtime: number | null;
    release_date: string | null;
    vote_average: number | null;
    genres: { name: string }[];
    videos?: { results: { key: string; site: string; type: string; official: boolean; iso_639_1: string }[] };
    credits?: {
      crew: { job: string; name: string }[];
      cast: { name: string }[];
    };
  };

  const ro = await tmdbFetch<Detail>(`/movie/${hit.id}`, {
    language: "ro-RO",
    append_to_response: "videos,credits",
  });

  // Fallback pe engleza pentru campurile pe care TMDB nu le are traduse.
  let en: Detail | null = null;
  if (!ro.overview || ro.genres.length === 0) {
    en = await tmdbFetch<Detail>(`/movie/${hit.id}`, {
      language: "en-US",
      append_to_response: "videos",
    });
  }

  const videos = [
    ...(ro.videos?.results ?? []),
    ...(en?.videos?.results ?? []),
  ].filter((v) => v.site === "YouTube");
  const trailer =
    videos.find((v) => v.type === "Trailer" && v.official) ??
    videos.find((v) => v.type === "Trailer") ??
    videos.find((v) => v.type === "Teaser") ??
    null;

  const director =
    ro.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const cast =
    ro.credits?.cast
      ?.slice(0, 4)
      .map((c) => c.name)
      .join(", ") || null;

  const genres = (ro.genres.length ? ro.genres : (en?.genres ?? []))
    .map((g) => g.name)
    .join(", ");

  return {
    imdbId,
    tmdbId: ro.id,
    title: ro.title || en?.title || ro.original_title,
    originalTitle: ro.original_title ?? null,
    synopsis: ro.overview || en?.overview || null,
    posterUrl: ro.poster_path
      ? `${IMAGE}/w500${ro.poster_path}`
      : en?.poster_path
        ? `${IMAGE}/w500${en.poster_path}`
        : null,
    backdropUrl: ro.backdrop_path ? `${IMAGE}/w1280${ro.backdrop_path}` : null,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    genres: genres || null,
    runtimeMin: ro.runtime ?? null,
    releaseYear: ro.release_date ? Number(ro.release_date.slice(0, 4)) : null,
    imdbRating: ro.vote_average ? Math.round(ro.vote_average * 10) / 10 : null,
    director,
    cast,
  };
}

export function isTmdbConfigured(): boolean {
  return key() !== null;
}
