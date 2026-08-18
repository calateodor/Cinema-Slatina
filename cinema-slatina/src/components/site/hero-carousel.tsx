"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  slug: string;
  eyebrow: string;
  title: string;
  synopsis: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string | null;
};

gsap.registerPlugin(useGSAP);

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const scope = useRef<HTMLElement>(null);

  /**
   * Momentul de deschidere al paginii: eticheta, titlul, textul și afișul intră
   * într-o singură secvență, ca genericul unui film. Se animează doar opacity și
   * transform, iar secvența este sărită complet la reduced motion.
   */
  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>(
          '[data-hero-slide="0"] [data-hero-item]',
        );
        if (items.length === 0) return;

        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(items, { opacity: 0, y: 18, duration: 0.6, stagger: 0.09 })
          .from(
            '[data-hero-slide="0"] [data-hero-poster]',
            { opacity: 0, y: 26, scale: 0.96, duration: 0.8 },
            "-=0.45",
          );
      });

      return () => media.revert();
    },
    { scope },
  );

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  // Embla pornește pe primul slide, deci starea inițială (0) este deja corectă;
  // ne abonăm doar la schimbările ulterioare.
  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  // Avans automat, oprit când utilizatorul preferă mișcare redusă.
  useEffect(() => {
    if (!embla || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => embla.scrollNext(), 7000);
    return () => window.clearInterval(id);
  }, [embla, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      ref={scope}
      className="screen-grain relative overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div
              key={slide.slug}
              data-hero-slide={index}
              className="min-w-0 flex-[0_0_100%]"
            >
              <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1.35fr_auto] md:gap-10 md:p-10">
                <div className="min-w-0">
                  <p
                    data-hero-item
                    className="ticket text-sm tracking-[0.28em] text-brand-orange"
                  >
                    {slide.eyebrow}
                  </p>
                  <h1
                    data-hero-item
                    className="display mt-3 text-balance text-[clamp(1.75rem,5.2vw,3.25rem)] text-foreground"
                  >
                    {slide.title}
                  </h1>
                  {slide.genres ? (
                    <p data-hero-item className="mt-3 text-sm text-brand-yellow/90">
                      {slide.genres}
                    </p>
                  ) : null}
                  {slide.synopsis ? (
                    <p
                      data-hero-item
                      className="mt-3 line-clamp-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]"
                    >
                      {slide.synopsis}
                    </p>
                  ) : null}

                  <div data-hero-item className="mt-6 flex flex-wrap gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_var(--brand-orange)] hover:bg-brand-orange-deep"
                    >
                      <Link href="/program">
                        <Ticket data-icon="inline-start" />
                        Rezervă gratuit
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="secondary"
                      className="rounded-full px-6 font-semibold"
                    >
                      <Link href={`/filme/${slide.slug}`}>
                        Vezi detalii
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <Link
                  href={`/filme/${slide.slug}`}
                  data-hero-poster
                  className="mx-auto w-40 transition-transform duration-500 hover:-translate-y-1 motion-reduce:transition-none sm:w-48 md:w-56"
                  aria-label={`Detalii despre ${slide.title}`}
                >
                  <MoviePoster
                    title={slide.title}
                    posterUrl={slide.posterUrl}
                    priority={index === 0}
                    sizes="(max-width: 768px) 40vw, 224px"
                    className="shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="flex items-center justify-between gap-4 px-6 pb-6 sm:px-8 md:px-10">
          <div className="flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.slug}
                type="button"
                aria-label={`Mergi la slide-ul ${i + 1}`}
                onClick={() => embla?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selected
                    ? "w-7 bg-brand-orange"
                    : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-border"
              onClick={() => embla?.scrollPrev()}
              aria-label="Slide-ul anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-border"
              onClick={() => embla?.scrollNext()}
              aria-label="Slide-ul următor"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
