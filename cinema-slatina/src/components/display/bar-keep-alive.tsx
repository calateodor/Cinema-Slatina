"use client";

import { useEffect } from "react";
import { safeReload, watchFrozenScreen, watchNewVersion } from "@/components/display/safe-reload";

/** Meniul se schimbă rar: îl reîncărcăm o dată la 6 ore (prețuri noi) și doar când site-ul răspunde. */
const RELOAD_MS = 6 * 60 * 60_000;

/** Ține televizorul de la bar la zi, fără să întrebe nimic în rest (nu cere baza de date). */
export function BarKeepAlive() {
  useEffect(() => {
    const reload = window.setTimeout(safeReload, RELOAD_MS);
    const stopWatch = watchFrozenScreen();
    const stopVersion = watchNewVersion();
    return () => {
      window.clearTimeout(reload);
      stopWatch();
      stopVersion();
    };
  }, []);
  return null;
}
