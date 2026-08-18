"use client";

import { useState } from "react";
import { Play, Video } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { youtubeId } from "@/lib/format";

/**
 * Trailerul filmului. Videoclipul se încarcă abia după click, ca să nu
 * încetinim pagina și să nu punem cookie-uri YouTube fără acordul vizitatorului.
 */
export function TrailerPlayer({
  url,
  title,
}: {
  url: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);

  if (!id) {
    return (
      <Empty className="aspect-video border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Video />
          </EmptyMedia>
          <EmptyDescription>Trailerul nu este disponibil încă.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface-sunken ring-1 ring-border">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={`Trailer ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-sunken ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Pornește trailerul pentru ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90 motion-reduce:transition-none"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_44px_-16px_var(--brand-orange)] transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
          <Play className="ml-0.5 size-7 fill-current" aria-hidden="true" />
        </span>
      </span>
      <span className="ticket absolute bottom-3 left-4 text-sm tracking-[0.2em] text-muted-foreground">
        TRAILER
      </span>
    </button>
  );
}
