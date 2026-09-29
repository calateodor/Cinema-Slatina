"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Border Glow — port fidel după react-bits (reactbits.dev/components/
   border-glow), în culorile cinematografului.

   Trei straturi, toate în CSS (`.bglow` din globals.css):
   - ::before — marginea: o plasă de gradiente colorate, vizibilă doar într-un
     con îndreptat spre cursor;
   - ::after — aceeași plasă, foarte estompată, pe interiorul de lângă margine;
   - .bglow-edge — halo-ul luminos din jurul cardului, pe partea cursorului.
   JS-ul doar măsoară cât de aproape e cursorul de margine și în ce unghi.
   Pe ecrane tactile (fără hover), cardul face o singură „trecere” de lumină
   când intră în ecran, ca efectul să nu lipsească pe telefon.
--------------------------------------------------------------------------- */

/** Culorile plasei: galbenul siglei, portocaliul, un alb cald. */
const COLORS = ["#ffde59", "#ff7a1a", "#fff1b8"] as const;
/** Culoarea halo-ului, în HSL (galben cald). */
const GLOW = { h: 46, s: 100, l: 70 };

const GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GRADIENT_KEYS = ["--gradient-one", "--gradient-two", "--gradient-three", "--gradient-four", "--gradient-five", "--gradient-six", "--gradient-seven"];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function glowVars(intensity: number): Record<string, string> {
  const base = `${GLOW.h}deg ${GLOW.s}% ${GLOW.l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  const vars: Record<string, string> = {};
  opacities.forEach((o, i) => {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(o * intensity, 100)}%)`;
  });
  GRADIENT_KEYS.forEach((key, i) => {
    vars[key] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${COLORS[COLOR_MAP[i]]} 0px, transparent 50%)`;
  });
  vars["--gradient-base"] = `linear-gradient(${COLORS[0]} 0 100%)`;
  return vars;
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (x: number) => number;
  onUpdate: (value: number) => void;
  onEnd?: () => void;
}) {
  const t0 = performance.now() + delay;
  const tick = () => {
    const t = Math.min((performance.now() - t0) / duration, 1);
    onUpdate(start + (end - start) * ease(Math.max(t, 0)));
    if (t < 1) requestAnimationFrame(tick);
    else onEnd?.();
  };
  window.setTimeout(() => requestAnimationFrame(tick), delay);
}

type Props = ComponentProps<"div"> & {
  /** Cât de aproape de margine începe lumina (0–100). */
  edgeSensitivity?: number;
  /** Cât de departe iese halo-ul din card, în px. */
  glowRadius?: number;
  glowIntensity?: number;
  /** Deschiderea conului de lumină de pe margine. */
  coneSpread?: number;
  fillOpacity?: number;
  /** Culoarea de fundal a cardului. */
  background?: string;
  /** Aspect de card din shadcn (padding, spațiere, text). */
  asCard?: boolean;
};

export function GlowCard({
  className,
  style,
  children,
  edgeSensitivity = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  fillOpacity = 0.45,
  background = "#131316",
  asCard = true,
  onPointerMove,
  ...props
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(e);
      const card = ref.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let angle = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      card.style.setProperty("--edge-proximity", (edge * 100).toFixed(3));
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
    },
    [onPointerMove],
  );

  // Pe ecrane tactile: o trecere de lumină în jurul cardului când apare.
  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    if (window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const angleStart = 110;
        const angleEnd = 465;
        card.classList.add("sweep-active");
        card.style.setProperty("--cursor-angle", `${angleStart}deg`);
        const setAngle = (v: number) =>
          card.style.setProperty("--cursor-angle", `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
        animateValue({ duration: 500, onUpdate: (v) => card.style.setProperty("--edge-proximity", String(v)) });
        animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: setAngle });
        animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: setAngle });
        animateValue({
          ease: easeInCubic,
          delay: 2500,
          duration: 1500,
          start: 100,
          end: 0,
          onUpdate: (v) => card.style.setProperty("--edge-proximity", String(v)),
          onEnd: () => card.classList.remove("sweep-active"),
        });
      },
      { threshold: 0.45 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-slot={asCard ? "card" : undefined}
      onPointerMove={handleMove}
      className={cn(
        "bglow",
        asCard &&
          "group/card flex flex-col gap-(--card-spacing) py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0",
        className,
      )}
      style={
        {
          "--card-bg": background,
          "--edge-sensitivity": edgeSensitivity,
          "--glow-padding": `${glowRadius}px`,
          "--cone-spread": coneSpread,
          "--fill-opacity": fillOpacity,
          ...glowVars(glowIntensity),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="bglow-edge" aria-hidden="true" />
      {children}
    </div>
  );
}
