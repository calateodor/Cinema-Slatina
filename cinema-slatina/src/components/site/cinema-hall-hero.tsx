"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { YouTubeScreen } from "@/components/site/youtube-screen";
import { ScreenSpill } from "@/components/site/projector-light";
import { Button } from "@/components/ui/button";
import { dayTabLabel, formatTime, isToday } from "@/lib/dates";
import { youtubeId } from "@/lib/format";
import { SCREEN_INSET_PX, screenBounds, type HallScene } from "@/lib/hall-scene";
import { matrix3dForQuad, type Quad } from "@/lib/perspective";
import type { HeroItem } from "@/server/queries";
import { Glare } from "@/components/motion/glare";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type Props = {
  items: HeroItem[];
  scene: HallScene;
  reservationsEnabled: boolean;
};

const WIDE_QUERY = "(min-width: 1024px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Sala reală a cinematografului, cu ecranul pornit. Pe ecran rulează trailerul
 * filmului care urmează; în stânga și în dreapta, pe jumătate ascunse după
 * ecran, stau afișele filmului dinainte și ale celui de după. Un click pe un
 * afiș îl face să zboare pe ecran, unde se dizolvă în trailer. Pe telefon,
 * afișele laterale devin un carusel sub sală.
 */
export function CinemaHallHero({ items, scene, reservationsEnabled }: Props) {
  const scope = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const flyingRef = useRef(false);

  const count = items.length;
  const active = items[index] ?? null;
  const prev = count > 1 ? items[(index - 1 + count) % count] : null;
  const next = count > 1 ? items[(index + 1) % count] : null;

  /**
   * Afișul apăsat zboară pe ecran: o copie a lui pornește din locul unde a
   * fost apăsat, crește până acoperă ecranul și se dizolvă în stop-cadrul
   * noului film, care între timp a fost pus pe ecran.
   */
  const flyTo = useCallback(
    (source: HTMLElement | null, newIndex: number, tilt = 0) => {
      const frame = frameRef.current;
      const poster = source?.querySelector("img");
      if (
        !frame ||
        !source ||
        !poster ||
        flyingRef.current ||
        window.matchMedia(REDUCED_QUERY).matches
      ) {
        setIndex(newIndex);
        return;
      }

      const from = poster.getBoundingClientRect();
      const to = frame.getBoundingClientRect();
      const ghost = document.createElement("div");
      ghost.className =
        "pointer-events-none fixed z-[60] overflow-hidden rounded-lg shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]";
      ghost.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;rotate:${tilt}deg;`;
      const img = document.createElement("img");
      img.src = poster.currentSrc || poster.src;
      img.alt = "";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      ghost.appendChild(img);
      document.body.appendChild(ghost);
      flyingRef.current = true;

      gsap
        .timeline({
          onComplete: () => {
            ghost.remove();
            flyingRef.current = false;
          },
        })
        .to(ghost, {
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          rotate: 0,
          duration: 0.7,
          ease: "power3.inOut",
          onComplete: () => setIndex(newIndex),
        })
        .to(ghost, { opacity: 0, duration: 0.5, ease: "power2.out" }, "+=0.05");
    },
    [],
  );

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      const newIndex = (index + delta + count) % count;
      const side = delta < 0 ? "left" : "right";
      const source = scope.current?.querySelector<HTMLElement>(
        `[data-hero-side="${side}"]`,
      );
      // Pe telefon cardurile laterale nu există; zboară din carusel.
      const visible = source && source.offsetParent !== null ? source : null;
      const stripItem = scope.current?.querySelector<HTMLElement>(
        `[data-strip-index="${newIndex}"] button`,
      );
      flyTo(visible ?? stripItem ?? null, newIndex, visible ? (delta < 0 ? -5 : 5) : 0);
    },
    [count, index, flyTo],
  );

  // Săgețile de la tastatură schimbă filmul de pe ecran.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        /input|textarea|select/i.test(e.target.tagName)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Caruselul de pe telefon urmărește filmul activ.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const item = strip.querySelector<HTMLElement>(`[data-strip-index="${index}"]`);
    item?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  /**
   * Perspectiva: ecranul din fotografie e un trapez, iar playerul e un
   * dreptunghi. Calculăm transformarea 3D care duce dreptunghiul playerului
   * exact pe cele patru colțuri ale ecranului, la orice lățime de fereastră.
   */
  useEffect(() => {
    const sceneEl = sceneRef.current;
    const box = boxRef.current;
    const frame = frameRef.current;
    if (!sceneEl || !box || !frame) return;

    const apply = () => {
      const wide = window.matchMedia(WIDE_QUERY).matches;
      const current = wide ? scene.wide : scene.tall;
      const inset = wide ? SCREEN_INSET_PX.wide : SCREEN_INSET_PX.tall;
      const sw = sceneEl.clientWidth;
      const sh = sceneEl.clientHeight;
      const bounds = screenBounds(current);
      const bx = (bounds.left / 100) * sw;
      const by = (bounds.top / 100) * sh;
      const points = current.screen.map(
        ([px, py]) => [(px / 100) * sw - bx, (py / 100) * sh - by] as const,
      );
      // Fiecare colț se trage cu câțiva pixeli spre centrul ecranului: pe
      // margine rămâne vizibilă bordura albă a pânzei, ca într-o sală reală.
      const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
      const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
      const quad = points.map(
        ([x, y]) => [x + Math.sign(cx - x) * inset, y + Math.sign(cy - y) * inset] as const,
      ) as unknown as Quad;
      frame.style.transform = matrix3dForQuad(box.clientWidth, box.clientHeight, quad);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(sceneEl);
    return () => observer.disconnect();
  }, [scene]);

  /**
   * Deschiderea: proiectorul „pornește” — ecranul se luminează din întuneric,
   * afișele laterale ies de după ecran, iar titlul urcă de sub el.
   */
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .fromTo(
            "[data-hero-screen-frame]",
            { filter: "brightness(0.05)" },
            { filter: "brightness(1)", duration: 1.4, clearProps: "filter" },
          )
          .from(
            "[data-hero-caption] > *",
            { y: 18, opacity: 0, duration: 0.6, stagger: 0.1 },
            "-=0.7",
          );
      });
      return () => media.revert();
    },
    { scope },
  );

  const wideBounds = screenBounds(scene.wide);
  const tallBounds = screenBounds(scene.tall);
  const vars = {
    "--sx-d": `${wideBounds.left}%`,
    "--sy-d": `${wideBounds.top}%`,
    "--sw-d": `${wideBounds.width}%`,
    "--sh-d": `${wideBounds.height}%`,
    "--sx-m": `${tallBounds.left}%`,
    "--sy-m": `${tallBounds.top}%`,
    "--sw-m": `${tallBounds.width}%`,
    "--sh-m": `${tallBounds.height}%`,
  } as CSSProperties;

  const stillUrl = active ? (active.movie.backdropUrl ?? active.movie.posterUrl) : null;
  const startsAt = active ? new Date(active.startsAt) : null;
  const reserveHref = active
    ? active.canReserve && reservationsEnabled
      ? `/rezervare/${active.screeningId}`
      : `/filme/${active.movie.slug}`
    : "/program";
  const reserveLabel = !active
    ? "Vezi programul"
    : active.canReserve && reservationsEnabled
      ? "Rezervă gratuit"
      : active.soldOut
        ? "Sala este plină"
        : "Vezi filmul";

  return (
    <section
      ref={scope}
      className="relative lg:-mt-32"
      aria-label="Filmul de pe ecran"
    >
      <div ref={sceneRef} className="hall-scene relative z-[1] w-full overflow-hidden" style={vars}>
        <Image
          src={scene.tall.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover lg:hidden"
        />
        <Image
          src={scene.wide.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover lg:block"
        />
        {/* Lumina filmului răsfrântă în sală, separat pentru cadrul înalt
            (telefon) și cel lat (desktop). */}
        <ScreenSpill imageUrl={stillUrl} frame={scene.tall} className="lg:hidden" />
        <ScreenSpill imageUrl={stillUrl} frame={scene.wide} className="hidden lg:block" />
        {/* Umbră sus, ca antetul să rămână lizibil peste tavanul sălii. */}
        <div
          className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-black/75 to-transparent"
          aria-hidden="true"
        />

        <div ref={boxRef} className="hall-screen absolute">
          {/* Eticheta 3D deasupra ecranului, ca pe afiș: galbenă, înclinată,
              lipită peste marginea de sus a pânzei. */}
          {active?.is3D ? (
            <span
              key={active.screeningId}
              className="poster-type tilt-strong pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[62%] text-[clamp(1.4rem,4.2cqw,3.4rem)] animate-in fade-in zoom-in-75 duration-500"
              aria-label="Proiecție 3D"
            >
              3D
            </span>
          ) : null}
          {prev ? (
            <SideCard
              key={prev.screeningId}
              side="left"
              item={prev}
              onSelect={(el) => flyTo(el, (index - 1 + count) % count, -5)}
            />
          ) : null}
          {next ? (
            <SideCard
              key={next.screeningId}
              side="right"
              item={next}
              onSelect={(el) => flyTo(el, (index + 1) % count, 5)}
            />
          ) : null}

          <div
            ref={frameRef}
            data-hero-screen-frame
            className="hall-projection relative z-20 h-full w-full origin-top-left overflow-hidden rounded-[0.6cqw] will-change-transform"
          >
            {/* Straturile „proiecției”: hotspot-ul lămpii și țesătura pânzei.
                Stau peste imagine, sub butonul de sunet. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
              <div className="projection-hotspot absolute inset-0" />
              <div className="projection-fabric absolute inset-0" />
            </div>
            <YouTubeScreen
              className="bg-transparent"
              videoId={active ? youtubeId(active.movie.trailerUrl) : null}
              stillUrl={stillUrl}
              title={active ? active.movie.title : "Programul nu este încă stabilit"}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>

          {/* Ca pe referință: titlul și ora pe același rând, în stânga; butonul
              în dreapta. Totul încape pe peretele dintre ecran și scaune. */}
          <div
            data-hero-caption
            className="absolute inset-x-[-4%] top-full z-20 mt-[0.9cqw] flex items-center justify-between gap-[2.5cqw]"
          >
            <div className="min-w-0 flex-1">
              {active ? (
                <>
                  <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-[1.6cqw] gap-y-0 drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]">
                    <Link
                      href={`/filme/${active.movie.slug}`}
                      className="display min-w-0 text-[clamp(1rem,3.3cqw,2.7rem)] leading-[1] text-white transition-colors hover:text-brand-yellow motion-reduce:transition-none"
                    >
                      {active.movie.title}
                    </Link>
                    <span className="poster-type whitespace-nowrap text-[clamp(1.1rem,3.4cqw,2.8rem)]">
                      {startsAt && !isToday(startsAt) ? (
                        <span className="ticket mr-[0.8cqw] align-middle text-[0.42em] tracking-[0.2em] text-white/85 [-webkit-text-stroke:0] [text-shadow:none]">
                          {dayTabLabel(startsAt).toUpperCase()}
                        </span>
                      ) : null}
                      {startsAt ? formatTime(startsAt) : "—"}
                    </span>
                  </h1>
                  <p className="mt-[0.4cqw] text-[clamp(0.6rem,1.25cqw,0.9rem)] text-white/70">
                    {active.hall.name} · {active.is3D ? "3D" : "2D"} ·{" "}
                    {active.isDubbed ? "Dublat" : "Subtitrat"}
                    {active.movie.ageRating ? ` · ${active.movie.ageRating}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="display text-[clamp(1rem,3.3cqw,2.7rem)] leading-[1] text-white">
                    Programul nu este încă stabilit
                  </h1>
                  <p className="mt-[0.4cqw] text-[clamp(0.6rem,1.25cqw,0.9rem)] text-white/70">
                    Filmele săptămânii apar aici imediat ce programul este publicat.
                  </p>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-[0.5cqw]">
              <Button
                asChild
                className="glow-yellow h-auto rounded-[0.8cqw] bg-brand-yellow px-[2.2cqw] py-[0.9cqw] text-[clamp(0.75rem,1.6cqw,1.2rem)] font-semibold text-brand-ink hover:bg-brand-yellow-soft"
              >
                <Link
                  href={reserveHref}
                  className="inline-flex items-center justify-center gap-[0.5em] text-center"
                >
                  <Ticket className="hidden size-[1.15em] shrink-0 sm:block" aria-hidden="true" />
                  <span>{reserveLabel}</span>
                </Link>
              </Button>
              <span className="text-[clamp(0.55rem,1.2cqw,0.85rem)] text-white/75">
                Intrare gratuită
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pe telefon: afișele laterale devin un carusel sub sală. */}
      {count > 1 ? (
        <div className="relative z-10 -mt-2 lg:hidden">
          <ul
            ref={stripRef}
            className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Filmele din program"
          >
            {items.map((item, i) => (
              <li key={item.screeningId} data-strip-index={i} className="w-24 shrink-0 snap-center">
                <button
                  type="button"
                  onClick={(e) => (i === index ? undefined : flyTo(e.currentTarget, i))}
                  aria-pressed={i === index}
                  aria-label={`Arată ${item.movie.title} pe ecran`}
                  className="border-glow group relative block w-full rounded-xl text-left focus-visible:outline-none"
                >
                  <span className="poster-type absolute -top-3 left-0 z-10 -rotate-6 text-lg">
                    {formatTime(new Date(item.startsAt))}
                  </span>
                  <MoviePoster
                    title={item.movie.title}
                    posterUrl={item.movie.posterUrl}
                    is3D={item.is3D}
                    sizes="96px"
                    className={cn(
                      "transition-all duration-300 motion-reduce:transition-none",
                      i === index
                        ? "glow-yellow ring-2 ring-brand-yellow"
                        : "opacity-70 group-hover:opacity-100 group-focus-visible:ring-2 group-focus-visible:ring-brand-yellow",
                    )}
                  />
                  <Glare />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Afișul de lângă ecran: mai mult de jumătate stă ascuns în spatele ecranului,
 * ca următoarea rolă care așteaptă. La hover iese de după ecran, se îndreaptă
 * și crește, cu conturul luminos care urmărește cursorul. Un click îl trimite
 * pe ecran.
 */
function SideCard({
  side,
  item,
  onSelect,
}: {
  side: "left" | "right";
  item: HeroItem;
  onSelect: (element: HTMLElement) => void;
}) {
  const Arrow = side === "left" ? ChevronLeft : ChevronRight;
  return (
    // Coloana ocupă toată înălțimea ecranului și centrează afișul cu flex.
    // Cheia (screeningId) remontează cardul la fiecare schimbare, ca să intre
    // de după ecran cu animația de mai jos.
    <div
      className={cn(
        "absolute inset-y-0 z-10 hidden w-[26%] items-center lg:flex",
        "animate-in fade-in duration-700 fill-mode-both",
        side === "left"
          ? "left-[-11%] slide-in-from-right-12"
          : "right-[-11%] slide-in-from-left-12",
      )}
    >
      <button
        type="button"
        data-hero-side={side}
        data-side={side}
        onClick={(e) => onSelect(e.currentTarget)}
        aria-label={`Arată ${item.movie.title} pe ecran`}
        className="hall-side-card border-glow group relative w-full rounded-[0.8cqw] text-left focus-visible:outline-none"
      >
        {/* Ora stă pe marginea vizibilă a afișului, nu sub ecran. */}
        <span
          className={cn(
            "poster-type absolute -top-[10%] z-10 -rotate-6 text-[clamp(0.9rem,2.1cqw,1.6rem)]",
            side === "left" ? "left-[3%]" : "right-[3%]",
          )}
        >
          {formatTime(new Date(item.startsAt))}
        </span>
        <MoviePoster
          title={item.movie.title}
          posterUrl={item.movie.posterUrl}
          is3D={item.is3D}
          sizes="(max-width: 1024px) 0px, 18vw"
          className="rounded-[0.8cqw] ring-1 ring-white/15 transition-shadow group-hover:ring-brand-yellow/60 group-focus-visible:ring-2 group-focus-visible:ring-brand-yellow motion-reduce:transition-none"
        />
        <Glare />
        <span
          className={cn(
            "absolute top-1/2 flex size-[clamp(2rem,3cqw,3rem)] -translate-y-1/2 items-center justify-center rounded-full bg-brand-yellow text-brand-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
            side === "left" ? "left-[8%]" : "right-[8%]",
          )}
          aria-hidden="true"
        >
          <Arrow className="size-[60%]" />
        </span>
      </button>
    </div>
  );
}
