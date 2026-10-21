"use client";

/* eslint-disable @next/next/no-img-element -- cadre mici, fixe, pregătite pentru cutie */
import { useEffect, useRef, useState } from "react";

/**
 * Versiunea clipurilor din public/bar/foto. Mărește-o când înlocuiești un clip:
 * cutiile descarcă o singură dată clipurile noi și le șterg pe cele vechi.
 */
const CLIP_VERSION = 3;
/** Unde țin cutiile clipurile, separat de trailere (tv-trailere-v1) și de rezervă (afisaj-sw.js). */
const CLIP_CACHE = "tv-clipuri";
/** Paza: la ce interval verificăm că clipul chiar merge, și după câte verificări îl repornim / renunțăm. */
const WATCH_MS = 4000;
const RESTART_AFTER = 2;
const GIVE_UP_AFTER = 5;

/**
 * Clipul, din memoria cutiei: prima dată îl descarcă și îl salvează în Cache
 * Storage; de atunci, la orice reîncărcare (și fără internet), vine de acolo,
 * fără nicio cerere la server. Întoarce adresa din memorie (blob).
 */
async function loadClip(path: string): Promise<string> {
  const url = `${path}.mp4?v=${CLIP_VERSION}`;
  let res: Response | undefined;
  try {
    const cache = await caches.open(CLIP_CACHE);
    res = await cache.match(url);
    if (!res) {
      const net = await fetch(url);
      if (!net.ok) throw new Error(String(net.status));
      await cache.put(url, net.clone());
      res = net;
    }
  } catch {
    // fără Cache Storage (sau plin): îl luăm direct, doar pentru încărcarea asta
    res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
  }
  return URL.createObjectURL(await res.blob());
}

/** Șterge din memoria cutiei clipurile de la versiunile vechi. */
async function dropOldClips() {
  try {
    const cache = await caches.open(CLIP_CACHE);
    for (const req of await cache.keys()) {
      if (!req.url.endsWith(`?v=${CLIP_VERSION}`)) await cache.delete(req);
    }
  } catch {
    // nu e grav: rămân doar niște clipuri vechi
  }
}

/**
 * Fundal dintr-un clip fără sunet care se repetă singur (bucla nativă a
 * browserului). `clip` e calea fără extensie: `.mp4` e clipul, `.webp` primul
 * lui cadru. Clipurile sunt făcute dinainte să se lege fără cusătură — la
 * nachos, cele trei filmări și trecerile dintre ele sunt deja în același
 * fișier —, așa că pagina nu schimbă nimic în timpul redării: un singur
 * player per clip, fără fade-uri peste video. Pe cutie rulează astfel exact
 * două clipuri (popcorn și nachos), 30 de cadre/s, fără B-frames.
 *
 * Paza: dacă clipul stă pe loc, îl repornim; dacă tot nu merge, rămâne poza
 * (primul cadru). Când pagina e ascunsă, clipul stă pe pauză.
 */
export function BarClip({ clip }: { clip: string }) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let stopped = false;
    let url = "";
    let watch = 0;

    const fail = () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(watch);
      v.pause();
      setPlaying(false);
    };

    // paza: clipul trebuie să înainteze
    let last = -1;
    let stuck = 0;
    const check = () => {
      if (stopped || document.hidden) return;
      if (!v.paused && v.currentTime !== last) {
        last = v.currentTime;
        stuck = 0;
        return;
      }
      stuck += 1;
      if (stuck >= GIVE_UP_AFTER) fail();
      else if (stuck >= RESTART_AFTER) v.play().catch(() => {});
    };

    const onVisibility = () => {
      if (stopped) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };

    loadClip(clip)
      .then((made) => {
        if (stopped) {
          URL.revokeObjectURL(made);
          return;
        }
        url = made;
        v.src = url;
        v.play()
          .then(() => {
            if (!stopped) setPlaying(true);
          })
          .catch(fail);
        watch = window.setInterval(check, WATCH_MS);
        dropOldClips();
      })
      .catch(fail);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(watch);
      document.removeEventListener("visibilitychange", onVisibility);
      v.pause();
      v.removeAttribute("src");
      v.load();
      if (url) URL.revokeObjectURL(url);
    };
  }, [clip]);

  return (
    <>
      {/* rezerva: primul cadru, cât se încarcă sau dacă clipul nu merge */}
      <img src={`${clip}.webp`} alt="" className="bar-bg" />
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="auto"
        className="bar-bg"
        style={{ visibility: playing ? "visible" : "hidden" }}
      />
    </>
  );
}
