/**
 * Completează filmele existente cu datele de la TMDB (poster, descriere în
 * română, trailer, gen, durată, distribuție), pe baza ID-ului de IMDb salvat.
 *
 *   npm run db:tmdb
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const KEY = process.env.TMDB_API_KEY;
const IMAGE = "https://image.tmdb.org/t/p";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function tmdb(
  path: string,
  params: Record<string, string> = {},
): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", KEY!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB a răspuns cu ${res.status}`);
  return res.json();
}

async function main() {
  if (!KEY) {
    console.error("TMDB_API_KEY lipsește din .env");
    process.exit(1);
  }

  const movies = await db.movie.findMany({ where: { imdbId: { not: null } } });
  console.log(`${movies.length} filme de sincronizat\n`);

  for (const movie of movies) {
    try {
      const found = await tmdb(`/find/${movie.imdbId}`, {
        external_source: "imdb_id",
      });
      const hit = found.movie_results?.[0];
      if (!hit) {
        console.log(`- ${movie.title}: negăsit pe TMDB`);
        continue;
      }

      const ro = await tmdb(`/movie/${hit.id}`, {
        language: "ro-RO",
        append_to_response: "videos,credits",
      });
      const en =
        !ro.overview || ro.genres.length === 0
          ? await tmdb(`/movie/${hit.id}`, {
              language: "en-US",
              append_to_response: "videos",
            })
          : null;

      const videos = [
        ...(ro.videos?.results ?? []),
        ...(en?.videos?.results ?? []),
      ].filter((v: any) => v.site === "YouTube");
      const trailer =
        videos.find((v: any) => v.type === "Trailer" && v.official) ??
        videos.find((v: any) => v.type === "Trailer") ??
        videos.find((v: any) => v.type === "Teaser");

      const genres = (ro.genres.length ? ro.genres : (en?.genres ?? []))
        .map((g: any) => g.name)
        .join(", ");

      await db.movie.update({
        where: { id: movie.id },
        data: {
          tmdbId: ro.id,
          title: ro.title || movie.title,
          originalTitle: ro.original_title ?? movie.originalTitle,
          synopsis: ro.overview || en?.overview || movie.synopsis,
          posterUrl: ro.poster_path
            ? `${IMAGE}/w500${ro.poster_path}`
            : movie.posterUrl,
          backdropUrl: ro.backdrop_path
            ? `${IMAGE}/w1280${ro.backdrop_path}`
            : movie.backdropUrl,
          trailerUrl: trailer
            ? `https://www.youtube.com/watch?v=${trailer.key}`
            : movie.trailerUrl,
          genres: genres || movie.genres,
          runtimeMin: ro.runtime ?? movie.runtimeMin,
          releaseYear: ro.release_date
            ? Number(ro.release_date.slice(0, 4))
            : movie.releaseYear,
          imdbRating: ro.vote_average
            ? Math.round(ro.vote_average * 10) / 10
            : movie.imdbRating,
          director:
            ro.credits?.crew?.find((c: any) => c.job === "Director")?.name ??
            movie.director,
          cast:
            ro.credits?.cast
              ?.slice(0, 4)
              .map((c: any) => c.name)
              .join(", ") || movie.cast,
          metadataSyncedAt: new Date(),
        },
      });

      console.log(
        `+ ${ro.title} — ${ro.poster_path ? "poster" : "fără poster"}${trailer ? ", trailer" : ""}`,
      );
    } catch (error) {
      console.log(`x ${movie.title}: ${(error as Error).message}`);
    }
  }

  await db.$disconnect();
  console.log("\nGata.");
}

main();
