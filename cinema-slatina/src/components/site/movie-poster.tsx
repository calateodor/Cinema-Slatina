import Image from "next/image";
import { Badge3D } from "@/components/site/showtime-badges";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  posterUrl?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Afișează eticheta 3D în colțul posterului. */
  is3D?: boolean;
};

/**
 * Paletă închisă, în familia afișelor de cinema. Alegerea este stabilă pentru
 * un titlu dat, ca același film să arate la fel peste tot în site.
 */
const POSTER_TONES = [
  "#3b1116", // roșu de catifea
  "#3a2408", // chihlimbar ars
  "#12262e", // albastru de proiecție
  "#2a1430", // violet de sală
  "#1b2a17", // verde de peliculă
  "#331a0d", // sepia
];

function toneFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) % 9973;
  }
  return POSTER_TONES[hash % POSTER_TONES.length];
}

/**
 * Posterul unui film. Când filmul nu are încă imagine preluată de la IMDb,
 * afișăm un afiș generat, în identitatea cinematografului, ca să nu rămână goluri.
 */
export function MoviePoster({
  title,
  posterUrl,
  className,
  sizes = "(max-width: 640px) 45vw, 200px",
  priority = false,
  is3D = false,
}: Props) {
  const tone = toneFromTitle(title);

  return (
    <div
      className={cn(
        "@container relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-secondary ring-1 ring-border",
        className,
      )}
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={`Afișul filmului ${title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[6cqw]"
          style={{
            background: `linear-gradient(155deg, ${tone} 0%, var(--surface-sunken) 82%)`,
          }}
          aria-label={`Afiș indisponibil pentru ${title}`}
        >
          <div className="film-strip h-[3cqw] w-full rounded-full opacity-60" />

          {/* Pe miniaturile foarte mici titlul nu ar fi lizibil, așa că îl ascundem. */}
          <p className="display hidden @[5rem]:line-clamp-5 @[5rem]:block text-balance text-[9cqw] leading-[1.1] text-foreground">
            {title}
          </p>

          <p className="ticket text-[4.5cqw] tracking-[0.25em] text-brand-yellow/80">
            CINEMA SLATINA
          </p>
        </div>
      )}

      {is3D ? <Badge3D /> : null}
    </div>
  );
}
