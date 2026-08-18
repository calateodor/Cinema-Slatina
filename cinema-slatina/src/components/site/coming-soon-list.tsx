import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { formatDayMonth } from "@/lib/dates";

export type ComingSoonMovie = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  genres: string | null;
  comingSoonFrom: Date | null;
};

export function ComingSoonList({ movies }: { movies: ComingSoonMovie[] }) {
  if (movies.length === 0) {
    return (
      <Empty className="mt-5 border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarClock />
          </EmptyMedia>
          <EmptyDescription>
            Momentan nu avem premiere anunțate. Revino curând.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="mt-5 flex flex-col gap-3">
      {movies.map((movie) => (
        <li key={movie.id}>
          <Card className="group transition-shadow duration-300 hover:ring-brand-orange/40 motion-reduce:transition-none">
            <CardContent>
              <Link
                href={`/filme/${movie.slug}`}
                className="flex items-center gap-4"
              >
                <div className="w-12 shrink-0 sm:w-14">
                  <MoviePoster
                    title={movie.title}
                    posterUrl={movie.posterUrl}
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-pretty text-sm font-semibold leading-snug transition-colors group-hover:text-brand-yellow motion-reduce:transition-none sm:text-base">
                    {movie.title}
                  </h3>
                  {movie.genres ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {movie.genres}
                    </p>
                  ) : null}
                </div>
                {movie.comingSoonFrom ? (
                  <Badge variant="outline" className="shrink-0 text-brand-orange">
                    Din {formatDayMonth(new Date(movie.comingSoonFrom))}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    În curând
                  </Badge>
                )}
              </Link>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
