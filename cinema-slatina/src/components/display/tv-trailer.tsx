"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  loadYouTubeApi,
  type YTEvent,
  type YTPlayer,
} from "@/components/site/youtube-screen";
import { cn } from "@/lib/utils";

/** Starea „se încarcă” a playerului YouTube (nu e în tipul nostru minimal). */
const BUFFERING = 3;
/** Cu cât e playerul mai mare decât rama: bara de titlu și butoanele cad în afară. */
const OVERSCAN = 1.24;

/** Clipul se arată abia după ce a rulat curat atâta timp, ascuns sub imagine… */
const GATE_MS = 10_000;
/** …și are încărcate în față măcar atâtea secunde. */
const AHEAD_S = 15;
/** La reluarea buclei (nu e poticnire) ajunge cât să dispară titlul YouTube. */
const LOOP_REVEAL_MS = 1800;
/** Atâtea poticniri la vedere în acest interval și renunțăm la clip. */
const VISIBLE_STALL_LIMIT = 3;
const STALL_WINDOW_MS = 180_000;
/** Dacă în acest timp nu apucă să ruleze curat, renunțăm. */
const WARMUP_LIMIT_MS = 150_000;
/** După ce am renunțat, mai încercăm o dată după atâta timp. */
const RETRY_MS = 300_000;

const STATE_NAMES: Record<number, string> = {
  [-1]: "NEPORNIT",
  0: "SFÂRȘIT",
  1: "RULEAZĂ",
  2: "PAUZĂ",
  3: "ÎNCĂRCARE",
  5: "PREGĂTIT",
};

/**
 * Trailerul de pe televizoarele sălilor: rulează în buclă, fără nimic scris de
 * YouTube peste el (marginile playerului, unde stă bara de titlu, sunt tăiate).
 *
 * Cutiile de pe televizoare sunt slabe, așa că:
 * - playerul e ținut mic (cât pentru `quality` linii, în pixeli reali) și
 *   mărit prin transform: YouTube alege calitatea după mărimea playerului;
 * - pe ecran stă imaginea mare a filmului cât timp clipul rulează ascuns
 *   dedesubt și se încarcă; clipul se arată abia după ce a mers curat
 *   `GATE_MS` și are destul încărcat în față;
 * - dacă se poticnește la vedere, imaginea îl acoperă și așteaptă din nou;
 *   la poticniri repetate (sau dacă nu apucă deloc să ruleze curat) renunțăm
 *   la clip, rămâne imaginea filmului cu o mișcare lentă, și reîncercăm
 *   peste câteva minute sau la filmul următor.
 *
 * `debug` scrie pe ecran ce face playerul, pentru diagnostic pe cutie.
 * Umple părintele, care trebuie să fie poziționat și să taie surplusul.
 */
export function TvTrailer({
  videoId,
  stillUrl,
  sound,
  quality = 480,
  debug = false,
}: {
  videoId: string | null;
  stillUrl: string | null;
  sound: boolean;
  /** Rezoluția cerută de la YouTube, în linii (360, 480, 720). */
  quality?: number;
  debug?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const soundRef = useRef(sound);
  /** Clipul curent a apucat să ruleze (deci browserul îi permite pornirea). */
  const startedRef = useRef(false);
  /** Clipul e la vedere (imaginea s-a ridicat de pe el). */
  const revealedRef = useRef(false);
  /** De când rulează fără întrerupere (0 = nu rulează). */
  const healthySinceRef = useRef(0);
  /** De când așteptăm, cu imaginea pe ecran, ca clipul să ruleze curat. */
  const warmupStartRef = useRef(0);
  /** Reluarea buclei, după sfârșitul clipului: nu e poticnire. */
  const loopingRef = useRef(false);
  const stallsRef = useRef<number[]>([]);
  const revealRef = useRef<number | undefined>(undefined);
  const retryRef = useRef<number | undefined>(undefined);
  const debugRef = useRef(debug);
  const t0Ref = useRef(0);
  const pollsRef = useRef(0);
  // Ce clip e la vedere acum. La alt film devine fals de la sine și imaginea
  // filmului acoperă playerul până e gata noul trailer.
  const [playingId, setPlayingId] = useState<string | null>(null);
  // Filmul pentru care am renunțat (deocamdată) la clip.
  const [gaveUpId, setGaveUpId] = useState<string | null>(null);
  // Crește la fiecare reîncercare, ca playerul să fie creat din nou.
  const [attempt, setAttempt] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const playing = videoId !== null && playingId === videoId;
  const gaveUp = videoId !== null && gaveUpId === videoId;

  // Funcțiile de mai jos ating doar ref-uri și setteri stabili; sunt fixate cu
  // useCallback, ca efectele să le poată avea ca dependențe fără să repornească.
  const note = useCallback((text: string) => {
    if (!debugRef.current) return;
    const at = ((Date.now() - t0Ref.current) / 1000).toFixed(1);
    setLog((lines) => [...lines.slice(-12), `+${at}s ${text}`]);
  }, []);

  /** Rămâne imaginea filmului; playerul se închide și reîncercăm mai târziu. */
  const giveUp = useCallback(
    (reason: string) => {
      const id = currentIdRef.current;
      note(
        `renunț la clip: ${reason}; reîncerc peste ${RETRY_MS / 60_000} min`,
      );
      window.clearTimeout(revealRef.current);
      revealedRef.current = false;
      healthySinceRef.current = 0;
      warmupStartRef.current = 0;
      setPlayingId(null);
      setGaveUpId(id);
      // playerul se distruge după ce iese din propriul lui eveniment
      window.setTimeout(() => {
        playerRef.current?.destroy();
        playerRef.current = null;
      }, 0);
      window.clearTimeout(retryRef.current);
      retryRef.current = window.setTimeout(() => {
        setGaveUpId(null);
        setAttempt((n) => n + 1);
      }, RETRY_MS);
    },
    [note],
  );

  /** Redarea s-a întrerupt. Întoarce `true` dacă tocmai am renunțat la clip. */
  const interrupted = useCallback(() => {
    healthySinceRef.current = 0;
    window.clearTimeout(revealRef.current);
    // ascuns sub imagine nu se vede nimic: doar așteptăm din nou să meargă curat
    if (!revealedRef.current) return false;
    revealedRef.current = false;
    setPlayingId(null);
    const now = Date.now();
    warmupStartRef.current = now;
    stallsRef.current = [
      ...stallsRef.current.filter((t) => now - t < STALL_WINDOW_MS),
      now,
    ];
    note(
      `poticnire la vedere ${stallsRef.current.length}/${VISIBLE_STALL_LIMIT}`,
    );
    if (stallsRef.current.length < VISIBLE_STALL_LIMIT) return false;
    giveUp("se poticnește și după ce s-a încărcat");
    return true;
  }, [giveUp, note]);

  useEffect(() => {
    debugRef.current = debug;
    if (!debug) return;
    t0Ref.current = Date.now();
    // datele cutiei, o singură dată (după hidratare)
    const id = window.setTimeout(() => {
      const chrome = /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?";
      const net = (
        navigator as Navigator & {
          connection?: { effectiveType?: string; downlink?: number };
        }
      ).connection;
      setLog((lines) => [
        `Chrome ${chrome} · ecran ${window.innerWidth}×${window.innerHeight} · densitate ${window.devicePixelRatio}` +
          (net
            ? ` · rețea ${net.effectiveType ?? "?"} ${net.downlink ?? "?"} Mbps`
            : ""),
        ...lines,
      ]);
    }, 0);
    return () => window.clearTimeout(id);
  }, [debug]);

  useEffect(() => {
    soundRef.current = sound;
    const player = playerRef.current;
    if (!player) return;
    if (sound) {
      player.unMute();
      player.setVolume(100);
    } else {
      player.mute();
    }
  }, [sound]);

  // Playerul mic, mărit prin transform cât să acopere rama (plus surplusul tăiat).
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const fit = () => {
      const iframe = mount.querySelector("iframe");
      if (!iframe) return;
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round((quality * 16) / 9 / dpr);
      const height = Math.round(width * (9 / 16));
      const scale =
        Math.max(mount.clientWidth / width, mount.clientHeight / height) *
        OVERSCAN;
      iframe.style.width = `${width}px`;
      iframe.style.height = `${height}px`;
      iframe.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
    };
    fit();
    // iframe-ul apare după ce se încarcă scriptul YouTube
    const retry = window.setInterval(fit, 1000);
    const stop = window.setTimeout(() => window.clearInterval(retry), 15_000);
    window.addEventListener("resize", fit);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(stop);
      window.removeEventListener("resize", fit);
    };
  }, [quality, videoId, attempt]);

  // Poarta: o dată pe secundă verificăm dacă clipul ascuns rulează curat de
  // destul timp și are destul încărcat în față; abia atunci îl arătăm.
  useEffect(() => {
    const poll = window.setInterval(() => {
      const player = playerRef.current;
      const id = currentIdRef.current;
      if (!player || !id || revealedRef.current || loopingRef.current) return;
      const now = Date.now();
      if (
        warmupStartRef.current &&
        now - warmupStartRef.current > WARMUP_LIMIT_MS
      ) {
        giveUp(`nu apucă să ruleze curat în ${WARMUP_LIMIT_MS / 1000}s`);
        return;
      }
      const since = healthySinceRef.current;
      if (!since) return;
      const cleanFor = now - since;
      const duration = player.getDuration?.() ?? 0;
      const loaded = player.getVideoLoadedFraction?.() ?? 1;
      const ahead = duration
        ? loaded * duration - (player.getCurrentTime?.() ?? 0)
        : Infinity;
      const buffered = !duration || loaded >= 0.97 || ahead >= AHEAD_S;
      pollsRef.current += 1;
      if (cleanFor < GATE_MS || !buffered) {
        if (pollsRef.current % 5 === 0) {
          note(
            `aștept: curat de ${Math.round(cleanFor / 1000)}s, încărcat +${Math.round(ahead)}s`,
          );
        }
        return;
      }
      revealedRef.current = true;
      warmupStartRef.current = 0;
      note(
        `curat de ${Math.round(cleanFor / 1000)}s, încărcat +${Math.round(ahead)}s → arăt clipul`,
      );
      setPlayingId(id);
    }, 1000);
    return () => window.clearInterval(poll);
  }, [giveUp, note]);

  useEffect(() => {
    currentIdRef.current = videoId;
    startedRef.current = false;
    revealedRef.current = false;
    loopingRef.current = false;
    healthySinceRef.current = 0;
    stallsRef.current = [];
    window.clearTimeout(revealRef.current);
    if (!videoId) {
      warmupStartRef.current = 0;
      playerRef.current?.pauseVideo();
      return;
    }
    warmupStartRef.current = Date.now();
    const mount = mountRef.current;
    if (!mount) return;

    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }

    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || playerRef.current) return;
      const host = document.createElement("div");
      mount.appendChild(host);
      note("creez playerul");
      playerRef.current = new YT.Player(host, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          cc_lang_pref: "xx",
          disablekb: 1,
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: YTEvent) => {
            note("gata");
            e.target.unloadModule?.("captions");
            e.target.unloadModule?.("cc");
            if (soundRef.current) {
              e.target.unMute();
              e.target.setVolume(100);
            } else {
              e.target.mute();
            }
            e.target.playVideo();
          },
          onStateChange: (e: YTEvent) => {
            note(
              `${STATE_NAMES[e.data] ?? e.data} · calitate ${e.target.getPlaybackQuality?.() ?? "?"}`,
            );
            if (e.data === YT.PlayerState.PLAYING) {
              startedRef.current = true;
              healthySinceRef.current = Date.now();
              // modulul de subtitrări se reîncarcă la fiecare clip
              e.target.unloadModule?.("captions");
              e.target.unloadModule?.("cc");
              if (loopingRef.current) {
                // bucla a repornit: îl arătăm imediat ce dispare titlul YouTube
                loopingRef.current = false;
                const id = currentIdRef.current;
                window.clearTimeout(revealRef.current);
                revealRef.current = window.setTimeout(() => {
                  revealedRef.current = true;
                  setPlayingId(id);
                }, LOOP_REVEAL_MS);
              }
            } else if (e.data === YT.PlayerState.ENDED) {
              // bucla: imaginea acoperă ecranul de final și o luăm de la capăt
              loopingRef.current = true;
              revealedRef.current = false;
              healthySinceRef.current = 0;
              window.clearTimeout(revealRef.current);
              setPlayingId(null);
              e.target.seekTo(0, true);
              e.target.playVideo();
            } else if (e.data === BUFFERING) {
              if (!loopingRef.current) interrupted();
            } else if (e.data === YT.PlayerState.PAUSED) {
              if (!currentIdRef.current) return;
              if (!loopingRef.current && interrupted()) return;
              // browserul a refuzat pornirea cu sunet: continuăm fără
              if (soundRef.current && !startedRef.current) e.target.mute();
              e.target.playVideo();
            }
          },
          onError: (e: YTEvent) => note(`EROARE ${e.data}`),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videoId, attempt, interrupted, note]);

  useEffect(
    () => () => {
      window.clearTimeout(revealRef.current);
      window.clearTimeout(retryRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  return (
    <div className="tv-layer bg-black">
      <div ref={mountRef} className="tv-layer tv-yt" aria-hidden="true" />
      <div
        className={cn(
          "tv-layer",
          playing && !gaveUp ? "tv-cover-off" : "tv-cover",
        )}
      >
        {stillUrl ? (
          <Image
            src={stillUrl}
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className={cn("object-cover", gaveUp && "tv-kenburns")}
          />
        ) : null}
      </div>
      {debug ? (
        <pre className="tv-debug">
          {log.join("\n")}
          {gaveUp ? "\n— rămâne imaginea filmului —" : ""}
        </pre>
      ) : null}
    </div>
  );
}
