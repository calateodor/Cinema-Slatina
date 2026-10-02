"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { loadYouTubeApi, type YTEvent, type YTPlayer } from "@/components/site/youtube-screen";
import { cn } from "@/lib/utils";

/** Cât ținem cadrul filmului peste clip la pornire, până dispare titlul YouTube. */
const REVEAL_MS = 3000;
/** La fel, după o poticnire (încărcare): cât să dispară iconița playerului. */
const RESUME_REVEAL_MS = 1800;
/** Starea „se încarcă” a playerului YouTube (nu e în tipul nostru minimal). */
const BUFFERING = 3;
/** Cu cât e playerul mai mare decât rama: bara de titlu și butoanele cad în afară. */
const OVERSCAN = 1.24;

/**
 * Trailerul de pe televizoarele sălilor: rulează în buclă, fără nimic scris de
 * YouTube peste el. Titlul clipului, logo-ul și iconițele apar doar la pornire,
 * la pauză, la încărcare și la sfârșit; în acele momente peste player stă
 * cadrul filmului, iar marginile playerului sunt oricum tăiate.
 *
 * Cutiile de pe televizoare sunt slabe, iar YouTube alege calitatea după
 * mărimea playerului. De aceea playerul e ținut mic (cât pentru `quality`
 * linii, în pixeli reali ai ecranului) și mărit prin transform până umple
 * rama: clipul vine la 480p în loc de 1080p și nu mai sacadează.
 *
 * Umple părintele, care trebuie să fie poziționat și să taie surplusul.
 */
export function TvTrailer({
  videoId,
  stillUrl,
  sound,
  quality = 480,
}: {
  videoId: string | null;
  stillUrl: string | null;
  sound: boolean;
  /** Rezoluția cerută de la YouTube, în linii (360, 480, 720). */
  quality?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const soundRef = useRef(sound);
  /** Clipul curent a apucat să ruleze (deci browserul îi permite pornirea). */
  const startedRef = useRef(false);
  const revealRef = useRef<number | undefined>(undefined);
  // Ce clip rulează „curat” acum. La alt film devine fals de la sine și
  // cadrul filmului acoperă playerul până pornește noul trailer.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playing = videoId !== null && playingId === videoId;

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
      const width = Math.round(((quality * 16) / 9) / dpr);
      const height = Math.round(width * (9 / 16));
      const scale = Math.max(mount.clientWidth / width, mount.clientHeight / height) * OVERSCAN;
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
  }, [quality, videoId]);

  useEffect(() => {
    currentIdRef.current = videoId;
    startedRef.current = false;
    if (!videoId) {
      playerRef.current?.pauseVideo();
      return;
    }
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
            window.clearTimeout(revealRef.current);
            if (e.data === YT.PlayerState.PLAYING) {
              const resumed = startedRef.current;
              startedRef.current = true;
              // modulul de subtitrări se reîncarcă la fiecare clip
              e.target.unloadModule?.("captions");
              e.target.unloadModule?.("cc");
              const id = currentIdRef.current;
              revealRef.current = window.setTimeout(
                () => setPlayingId(id),
                resumed ? RESUME_REVEAL_MS : REVEAL_MS,
              );
            } else if (e.data === YT.PlayerState.ENDED) {
              // bucla: acoperim ecranul de final și o luăm de la capăt
              startedRef.current = false;
              setPlayingId(null);
              e.target.seekTo(0, true);
              e.target.playVideo();
            } else if (e.data === BUFFERING) {
              // clipul s-a poticnit: cadrul filmului acoperă iconița playerului
              setPlayingId(null);
            } else if (e.data === YT.PlayerState.PAUSED) {
              setPlayingId(null);
              if (!currentIdRef.current) return;
              // browserul a refuzat pornirea cu sunet: continuăm fără
              if (soundRef.current && !startedRef.current) e.target.mute();
              e.target.playVideo();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(
    () => () => {
      window.clearTimeout(revealRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  return (
    <div className="tv-layer bg-black">
      <div ref={mountRef} className="tv-layer tv-yt" aria-hidden="true" />
      <div className={cn("tv-layer", playing ? "tv-cover-off" : "tv-cover")}>
        {stillUrl ? (
          <Image src={stillUrl} alt="" fill sizes="100vw" quality={90} className="object-cover" />
        ) : null}
      </div>
    </div>
  );
}
