/** Cât așteptăm între încercări, cât internetul cutiei e căzut. */
const RETRY_MS = 30_000;

/**
 * Reîncarcă pagina televizorului doar dacă site-ul răspunde. Un `reload` pe
 * internet căzut lasă cutia pe pagina de eroare a browserului („Webpage not
 * available”), din care nu mai iese singură — cum s-a întâmplat la Sala Roșie
 * pe 9 octombrie 2026. Așa, încearcă la 30 de secunde până merge.
 */
export function safeReload() {
  fetch(window.location.href, { method: "HEAD", cache: "no-store" })
    .then((res) => {
      if (res.ok) window.location.reload();
      else window.setTimeout(safeReload, RETRY_MS);
    })
    .catch(() => window.setTimeout(safeReload, RETRY_MS));
}

/** La ce interval verificăm că ecranul încă se redesenează. */
const WATCH_MS = 20_000;
/** Cât are voie un cadru să întârzie înainte să-l socotim ratat. */
const FRAME_LIMIT_MS = 5_000;
/** După câte verificări ratate la rând reîncărcăm pagina. */
const MISSES = 3;
/** Cel mult o reîncărcare a pazei la atâta timp (dacă televizorul e stins,
    cutia poate să nu mai deseneze deloc și nu vrem să reîncarce în buclă). */
const WATCH_RELOAD_GAP_MS = 15 * 60_000;
const WATCH_RELOAD_KEY = "tv_paza_reincarcare";

function lastWatchReload(): number {
  try {
    return Number(window.localStorage.getItem(WATCH_RELOAD_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Paza ecranului înghețat. Pe 9 octombrie 2026 televizorul de la casierie a
 * rămas cu imaginea de la 21:00, deși pagina încă cerea programul în fiecare
 * minut: codul mergea, dar placa video a cutiei nu mai desena. Așa că la 20 de
 * secunde cerem un singur cadru; dacă trei la rând nu vin, reîncărcăm pagina.
 * Nu desenăm nimic în plus și nu ținem o buclă pornită pe cutia slabă.
 * Întoarce funcția care oprește paza.
 */
export function watchFrozenScreen(): () => void {
  let misses = 0;
  let stopped = false;
  const check = () => {
    if (stopped || document.hidden) return;
    let painted = false;
    window.requestAnimationFrame(() => {
      painted = true;
    });
    window.setTimeout(() => {
      if (stopped) return;
      misses = painted ? 0 : misses + 1;
      if (misses >= MISSES && Date.now() - lastWatchReload() > WATCH_RELOAD_GAP_MS) {
        stopped = true;
        try {
          window.localStorage.setItem(WATCH_RELOAD_KEY, String(Date.now()));
        } catch {
          // fără memorie locală reîncărcăm oricum
        }
        safeReload();
      }
    }, FRAME_LIMIT_MS);
  };
  const id = window.setInterval(check, WATCH_MS);
  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}
