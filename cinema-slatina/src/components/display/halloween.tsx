/* eslint-disable @next/next/no-img-element -- imagini mici, fixe, fără optimizare */

import type { DisplayTheme } from "@/components/display/display-board";

/** Până când stă tema de Halloween pe televizoare (ora României). */
const HALLOWEEN_UNTIL = new Date("2026-11-02T00:00:00+02:00");

/** Tema de sezon a televizoarelor din /afisaj, după dată. */
export function seasonTheme(now: Date = new Date()): DisplayTheme | undefined {
  return now < HALLOWEEN_UNTIL ? "halloween" : undefined;
}

/**
 * Tema de Halloween a afișajului: pe /afisaj până pe 1 noiembrie inclusiv
 * (vezi `seasonTheme`); pe /halloween se vede oricând, de probă.
 * Imaginile sunt pregătite din D:\Teo\Site Cinema\Halloween la mărimea
 * ecranului cutiilor, în public/teme/halloween (toate împreună sub 100 KB).
 * Tot ce se mișcă e doar `transform`, pe care îl face placa video.
 */

/** Păianjenii (negri și albi) care se lasă pe fir o dată la 10 secunde, la o secundă unii de alții. */
export function HalloweenSpiders() {
  return (
    <div className="tv-layer pointer-events-none z-30" aria-hidden="true">
      <img src="/teme/halloween/paianjeni-negri.webp" alt="" className="tv-spider tv-spider-left" />
      <img src="/teme/halloween/paianjeni-albi.webp" alt="" className="tv-spider tv-spider-right" />
    </div>
  );
}

/** Ghirlandele de pe marginile televizoarelor sălilor. */
export function HalloweenFrame() {
  return (
    <div className="tv-layer pointer-events-none" aria-hidden="true">
      <span className="tv-hw-side tv-hw-left" />
      <span className="tv-hw-side tv-hw-right" />
      <span className="tv-hw-edge tv-hw-top" />
      <span className="tv-hw-edge tv-hw-bottom" />
    </div>
  );
}
