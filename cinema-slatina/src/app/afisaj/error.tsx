"use client";

import { useEffect } from "react";

/** Peste atât, televizorul reîncearcă singur pagina. */
const RETRY_MS = 30_000;

/**
 * Dacă site-ul sau baza de date cad o vreme, televizorul nu rămâne blocat pe
 * „This page couldn't load” (cum s-a întâmplat pe 8 octombrie 2026, când
 * cineva trebuia să apese Reload cu mouse-ul): arată un ecran negru discret și
 * reîncarcă singur pagina la 30 de secunde, până merge din nou.
 */
export default function DisplayError() {
  useEffect(() => {
    const id = window.setTimeout(() => window.location.reload(), RETRY_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-black">
      <p className="ticket text-[2vw] tracking-[0.2em] text-white/40">PROGRAMUL REVINE ÎN CURÂND</p>
    </div>
  );
}
