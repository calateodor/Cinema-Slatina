import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export type RailMovie = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  genres?: string | null;
  is3D?: boolean;
};

/** Carusel orizontal cu afișele filmelor din săptămână. */
export function MovieRail({ movies }: { movies: RailMovie[] }) {
  if (movies.length === 0) {
    return (
      <Empty className="mt-5 border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clapperboard />
          </EmptyMedia>
          <EmptyDescription>
            Filmele săptămânii apar aici imediat ce programul este publicat.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      <ul className="flex gap-4">
        {movies.map((movie) => (
          <li key={movie.id} className="w-32 shrink-0 sm:w-36">
            <Link
              href={`/filme/${movie.slug}`}
              className="group flex flex-col gap-1"
            >
              <MoviePoster
                title={movie.title}
                posterUrl={movie.posterUrl}
                is3D={movie.is3D}
                sizes="144px"
                className="transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-brand-yellow/50 motion-reduce:transition-none"
              />
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-brand-yellow motion-reduce:transition-none">
                {movie.title}
              </p>
              {movie.genres ? (
                <p className="truncate text-xs text-muted-foreground">
                  {movie.genres}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
