/*
 * Rezerva televizoarelor (/afisaj...): când cutia pierde internetul exact la o
 * reîncărcare, browserul arăta „Webpage not available” și rămânea acolo (Sala
 * Roșie pe 9 oct., casieria pe 19 oct. 2026). Acum pagina vine întâi de la
 * site, ca înainte; doar dacă rețeaua nu răspunde, televizorul primește ultima
 * pagină bună salvată pe cutie, iar codul ei reîncearcă singur să ia programul.
 * Nu cere nimic în plus de la server: păstrează doar ce cutia descarcă oricum.
 */
const PAGES = "tv-pagini-v1";
const ASSETS = "tv-fisiere-v1";
/** Câte fișiere (postere, imagini, cod) ținem cel mult; cele vechi se șterg. */
const MAX_ASSETS = 300;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // clipurile barului stau acum doar în tv-clipuri; scoatem copiile vechi de aici
      const cache = await caches.open(ASSETS);
      for (const req of await cache.keys()) {
        if (new URL(req.url).pathname.endsWith(".mp4")) await cache.delete(req);
      }
      await self.clients.claim();
    })(),
  ),
);

/** Ce merită păstrat pentru când nu e rețea: codul paginii și imaginile ei. */
function isAsset(url) {
  // clipurile barului le ține pagina în tv-clipuri (vezi bar-clips.tsx)
  if (url.pathname.endsWith(".mp4")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/posters/") ||
    url.pathname.startsWith("/teme/") ||
    url.pathname.startsWith("/bar/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/hall/") ||
    url.pathname.startsWith("/_next/image")
  );
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
}

/** Cât așteptăm pagina de la site înainte să arătăm copia salvată (rețea care atârnă). */
const PAGE_WAIT_MS = 10_000;

/** Întâi rețeaua; ce vine bun se salvează; fără rețea, copia salvată. */
async function networkFirst(request, cacheName, key, waitMs) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then(async (res) => {
    if (res.ok && res.type === "basic" && !res.redirected) {
      await cache.put(key, res.clone());
      if (cacheName === ASSETS) trim(cache);
    }
    return res;
  });
  const saved = () => cache.match(key);
  if (!waitMs) {
    return network.catch(async (err) => (await saved()) || Promise.reject(err));
  }
  // pagina: dacă site-ul nu răspunde în câteva secunde și avem o copie, o arătăm
  return new Promise((resolve, reject) => {
    let done = false;
    const fallback = async (err) => {
      const copy = await saved();
      if (done) return;
      if (copy) {
        done = true;
        resolve(copy);
      } else if (err) {
        done = true;
        reject(err);
      }
    };
    const timer = setTimeout(() => fallback(null), waitMs);
    network.then(
      (res) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          resolve(res);
        }
      },
      (err) => {
        clearTimeout(timer);
        fallback(err);
      },
    );
  });
}

/** Codul din /_next/static/immutable nu se schimbă niciodată sub același nume: întâi copia. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(request);
  if (saved) return saved;
  const res = await fetch(request);
  if (res.ok && res.type === "basic" && !res.redirected) {
    await cache.put(request, res.clone());
    trim(cache);
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" && url.pathname.startsWith("/afisaj")) {
    // cheia e adresa fără parametri, ca ?debug sau alte variante să aibă o rezervă
    event.respondWith(networkFirst(req, PAGES, url.origin + url.pathname, PAGE_WAIT_MS));
    return;
  }
  if (url.pathname.startsWith("/_next/static/immutable/")) {
    event.respondWith(cacheFirst(req));
  } else if (isAsset(url)) {
    event.respondWith(networkFirst(req, ASSETS, req, 0));
  }
});
