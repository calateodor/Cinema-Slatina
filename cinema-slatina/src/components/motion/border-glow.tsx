"use client";

import { useEffect } from "react";
import { hasFinePointer, sweepGlow } from "@/components/motion/glow-card";

/**
 * Conturul luminos care urmărește cursorul (adaptare după „Border Glow” din
 * react-bits). Un singur ascultător pe document servește toate elementele cu
 * clasa `border-glow`: pentru cel de sub cursor calculăm cât de aproape e
 * cursorul de margine și în ce direcție, iar CSS-ul din `globals.css`
 * desenează inelul colorat și halo-ul pe partea respectivă.
 */
export function BorderGlowTracker() {
  useEffect(() => {
    // Fără mouse (telefon, tabletă): lumina trece o dată, doar la atingere.
    if (!hasFinePointer()) {
      const onDown = (e: PointerEvent) => {
        const target = e.target instanceof Element ? e.target.closest<HTMLElement>(".border-glow") : null;
        if (target) sweepGlow(target);
      };
      document.addEventListener("pointerdown", onDown, { passive: true });
      return () => document.removeEventListener("pointerdown", onDown);
    }

    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const target = e.target instanceof Element ? e.target.closest<HTMLElement>(".border-glow") : null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = e.clientX - rect.left - cx;
      const dy = e.clientY - rect.top - cy;

      // 0 în centru, 1 pe margine (react-bits: edgeProximity).
      const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;

      // Direcția (vector unitar) spre cursor, pentru halo-ul deplasat.
      const length = Math.hypot(dx, dy) || 1;

      target.style.setProperty("--edge-proximity", (edge * 100).toFixed(2));
      target.style.setProperty("--cursor-angle", `${angle.toFixed(2)}deg`);
      target.style.setProperty("--gdx", (dx / length).toFixed(3));
      target.style.setProperty("--gdy", (dy / length).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
