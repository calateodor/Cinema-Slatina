"use client";

/* eslint-disable @next/next/no-img-element -- cadre mici, fixe, pregătite pentru cutie */
import { useEffect, useRef, useState } from "react";

/**
 * Versiunea clipurilor din public/bar/foto. Mărește-o când înlocuiești un clip:
 * cutiile descarcă o singură dată clipurile noi și le șterg pe cele vechi.
 */
const CLIP_VERSION = 1;
/** Unde țin cutiile clipurile, separat de trailere (tv-trailere-v1) și de rezervă (afisaj-sw.js). */
const CLIP_CACHE = "tv-clipuri";
/** Cât durează trecerea de la un clip la următorul (egal cu tranziția din .bar-clip). */
const FADE_MS = 800;
/** Paza: la ce interval verificăm că clipul chiar merge, și după câte verificări îl repornim / renunțăm. */
const WATCH_MS = 4000;
const RESTART_AFTER = 2;
const GIVE_UP_AFTER = 5;

/**
 * Un clip, din memoria cutiei: prima dată îl descarcă și îl salvează în Cache
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
 * Fundal din clipuri scurte, fără sunet. `clips` sunt căile fără extensie:
 * `.mp4` e clipul, `.webp` primul lui cadru.
 *
 * - Un clip (popcorn): un singur player, cu bucla nativă a browserului; clipul
 *   e făcut să se lege fără cusătură (capătul trece moale în început).
 * - Mai multe (nachos): doar două playere care se schimbă între ele — cel
 *   vizibil și cel care așteaptă clipul următor, gata încărcat. La capăt,
 *   următorul pornește și apare cu fade; cel vechi se oprește și primește
 *   clipul de după. Așa cutia nu decodează niciodată mai mult de două clipuri.
 *
 * Paza: dacă clipul vizibil stă pe loc, îl repornim; dacă tot nu merge,
 * rămân pozele (primele cadre). Când pagina e ascunsă, clipurile stau pe pauză.
 */
export function BarClips({ clips }: { clips: string[] }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const single = clips.length === 1;

  useEffect(() => {
    let stopped = false;
    let urls: string[] = [];
    let timers: number[] = [];
    let watch = 0;

    const players = () => [a.current, b.current].filter((v): v is HTMLVideoElement => v !== null);
    let slot = 0; // playerul vizibil
    let index = 0; // clipul din playerul vizibil
    let switching = false;

    const show = (s: number) => {
      players().forEach((v, i) => {
        v.style.opacity = i === s ? "1" : "0";
      });
    };
    const fail = () => {
      if (stopped) return;
      stopped = true;
      players().forEach((v) => v.pause());
      setFailed(true);
    };
    const start = (v: HTMLVideoElement) => {
      v.currentTime = 0;
      v.play().catch(fail);
    };

    // nachos: aproape de capăt, pornește clipul următor (deja încărcat în celălalt player)
    const onTime = () => {
      const v = players()[slot];
      if (stopped || single || switching || !v || !v.duration) return;
      if (v.currentTime < v.duration - FADE_MS / 1000) return;
      switching = true;
      const prev = slot;
      slot = 1 - slot;
      index = (index + 1) % urls.length;
      start(players()[slot]);
      show(slot);
      // după fade, playerul vechi se oprește și își pregătește clipul de după
      timers.push(
        window.setTimeout(() => {
          const old = players()[prev];
          if (stopped || !old) return;
          old.pause();
          old.src = urls[(index + 1) % urls.length];
          old.load();
          switching = false;
        }, FADE_MS + 100),
      );
    };

    // paza: clipul vizibil trebuie să înainteze
    let last = -1;
    let stuck = 0;
    const check = () => {
      if (stopped || document.hidden) return;
      const v = players()[slot];
      if (!v) return;
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
      const v = players()[slot];
      if (stopped || !v) return;
      if (document.hidden) players().forEach((p) => p.pause());
      else v.play().catch(() => {});
    };

    Promise.all(clips.map(loadClip))
      .then((made) => {
        if (stopped) {
          made.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        urls = made;
        setReady(true);
        const [first, second] = players();
        if (!first) return;
        first.src = urls[0];
        if (!single && second) {
          second.src = urls[1 % urls.length];
          second.load();
        }
        show(0);
        start(first);
        watch = window.setInterval(check, WATCH_MS);
        dropOldClips();
      })
      .catch(fail);

    const listeners = players().map((v) => {
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("ended", onTime);
      return v;
    });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(watch);
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      listeners.forEach((v) => {
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("ended", onTime);
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      document.removeEventListener("visibilitychange", onVisibility);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [clips, single]);

  const playing = ready && !failed;
  return (
    <>
      {/* rezerva: primele cadre; fără clipuri, se schimbă una în alta (doar CSS) */}
      <img src={`${clips[0]}.webp`} alt="" className="bar-bg" />
      {!playing
        ? clips.slice(1, 3).map((c, k) => <img key={c} src={`${c}.webp`} alt="" className={`bar-bg bar-fade-${k + 2}`} />)
        : null}
      <video
        ref={a}
        muted
        loop={single}
        playsInline
        preload="auto"
        className="bar-bg bar-clip"
        style={{ opacity: 0, visibility: playing ? "visible" : "hidden" }}
      />
      {!single ? (
        <video
          ref={b}
          muted
          playsInline
          preload="auto"
          className="bar-bg bar-clip"
          style={{ opacity: 0, visibility: playing ? "visible" : "hidden" }}
        />
      ) : null}
    </>
  );
}
