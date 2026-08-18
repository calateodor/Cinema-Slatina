/**
 * Caută trailere reale pe TMDB pentru filmele din bază și verifică fiecare link
 * pe YouTube înainte de a-l salva. Linkurile moarte sunt șterse, ca pagina să
 * scrie „trailerul nu este disponibil” în loc să afișeze un player stricat.
 *
 *   npm run db:trailers
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const KEY = process.env.TMDB_API_KEY;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function youtubeId(url: string | null): string | null {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;
}

/** Un videoclip e bun doar dacă YouTube îl recunoaște și permite încorporarea. */
async function playable(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!KEY) {
    console.error("TMDB_API_KEY lipsește din .env");
    process.exit(1);
  }

  const movies = await db.movie.findMany();

  for (const movie of movies) {
    const current = youtubeId(movie.trailerUrl);
    if (current && (await playable(current))) {
      console.log(`= ${movie.title}: trailerul actual funcționează`);
      continue;
    }

    let tmdbId = movie.tmdbId;
    if (!tmdbId && movie.imdbId) {
      const found = await (
        await fetch(
          `https://api.themoviedb.org/3/find/${movie.imdbId}?api_key=${KEY}&external_source=imdb_id`,
        )
      ).json();
      tmdbId = found.movie_results?.[0]?.id ?? null;
    }

    if (!tmdbId) {
      if (current) {
        await db.movie.update({
          where: { id: movie.id },
          data: { trailerUrl: null },
        });
        console.log(`x ${movie.title}: link mort șters, nu am de unde lua altul`);
      } else {
        console.log(`- ${movie.title}: fără trailer și fără potrivire TMDB`);
      }
      continue;
    }

    // Fără parametrul de limbă, TMDB întoarce toate videoclipurile.
    const videos = await (
      await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${KEY}`,
      )
    ).json();

    const candidates = (videos.results ?? [])
      .filter((v: any) => v.site === "YouTube")
      .sort((a: any, b: any) => {
        const score = (v: any) =>
          (v.type === "Trailer" ? 2 : v.type === "Teaser" ? 1 : 0) +
          (v.official ? 1 : 0);
        return score(b) - score(a);
      });

    let chosen: string | null = null;
    for (const v of candidates) {
      if (await playable(v.key)) {
        chosen = v.key;
        break;
      }
    }

    await db.movie.update({
      where: { id: movie.id },
      data: {
        trailerUrl: chosen ? `https://www.youtube.com/watch?v=${chosen}` : null,
        tmdbId,
      },
    });

    console.log(
      chosen
        ? `+ ${movie.title}: trailer nou, verificat (${chosen})`
        : `x ${movie.title}: TMDB nu are niciun trailer redabil`,
    );
  }

  await db.$disconnect();
  console.log("\nGata.");
}

main();
