"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Dunga de lucire de pe cardurile de fotbal din site-ul CSM: o reflexie
 * diagonală care urmărește mouse-ul peste tot cardul. Se pune ca ultim copil
 * într-un card `relative` dintr-un `group`; ascultă mișcarea pe cel mai
 * apropiat card cu Border Glow (sau pe `group`). Aspectul e în CSS (`.glare` din globals.css).
 */
export function Glare({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const band = ref.current;
    const card = band?.closest<HTMLElement>(".bglow, .group") ?? band?.parentElement?.parentElement;
    if (!band || !card) return;
    // Fără mouse: dunga traversează cardul o singură dată, doar la atingere.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const tap = () => {
        const glare = band.parentElement;
        if (!glare || glare.classList.contains("glare-tap")) return;
        glare.classList.add("glare-tap");
        window.setTimeout(() => glare.classList.remove("glare-tap"), 900);
      };
      card.addEventListener("pointerdown", tap);
      return () => card.removeEventListener("pointerdown", tap);
    }

    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      band.style.setProperty("--lux", px.toFixed(3));
      band.style.setProperty("--luy", py.toFixed(3));
    };
    const leave = () => {
      band.style.removeProperty("--lux");
      band.style.removeProperty("--luy");
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span aria-hidden="true" className={cn("glare", className)}>
      <span ref={ref} className="glare-band" />
    </span>
  );
}
