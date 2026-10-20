import { useSyncExternalStore } from "react";

/**
 * Ceasul televizoarelor, după ora serverului, nu după ceasul cutiei. Cutiile
 * TV pot avea ora greșită (fuse orar setat prost, sincronizare oprită): pe 20
 * octombrie 2026 cutia de la casierie era cu o oră în urmă, deci și ceasul și
 * „Începe în” de pe ecran. Aici ținem diferența dintre server și cutie și o
 * adunăm la `Date.now()` peste tot unde ecranul are nevoie de ora curentă.
 */

/** La cât timp reîntrebăm serverul (ceasul cutiei poate și să o ia razna). */
const SYNC_MS = 10 * 60_000;
/** Răspunsurile mai lente de atât nu dau o oră destul de precisă: le ignorăm. */
const MAX_ROUND_TRIP_MS = 5_000;
/** Sub atâta diferență nu mutăm ceasul (evităm să sară cifrele degeaba). */
const MIN_CHANGE_MS = 2_000;

let offset = 0;
const listeners = new Set<() => void>();

/** Ora curentă corectată, în milisecunde. */
export function tvNowMs(): number {
  return Date.now() + offset;
}

/** Ora curentă corectată. */
export function tvNow(): Date {
  return new Date(tvNowMs());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Diferența curentă server − cutie; componentele se redesenează când se schimbă. */
export function useTvClockOffset(): number {
  return useSyncExternalStore(subscribe, () => offset, () => 0);
}

function syncOnce() {
  const sent = Date.now();
  fetch("/api/ora", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { t?: number } | null) => {
      const received = Date.now();
      if (typeof data?.t !== "number" || received - sent > MAX_ROUND_TRIP_MS) return;
      // ora serverului corespunde mijlocului drumului dus-întors
      const next = data.t - (sent + received) / 2;
      if (Math.abs(next - offset) < MIN_CHANGE_MS) return;
      offset = next;
      listeners.forEach((l) => l());
    })
    // fără internet păstrăm ultima diferență cunoscută
    .catch(() => {});
}

/** Pornește sincronizarea cu serverul; întoarce funcția care o oprește. */
export function syncTvClock(): () => void {
  syncOnce();
  const id = window.setInterval(syncOnce, SYNC_MS);
  return () => window.clearInterval(id);
}
