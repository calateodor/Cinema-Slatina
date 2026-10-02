"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { loadYouTubeApi, type YTEvent, type YTPlayer } from "@/components/site/youtube-screen";
import { cn } from "@/lib/utils";

/** Cât ținem cadrul filmului peste clip după pornire, până dispare titlul YouTube. */
const REVEAL_MS = 3000;

/**
 * Trailerul de pe televizoarele sălilor: rulează în buclă, fără nimic scris de
 * YouTube peste el. Titlul clipului, logo-ul și butoanele apar doar la pornire,
 * la pauză și la sfârșit; în acele momente peste player stă cadrul filmului,
 * iar marginile playerului (unde stă bara de titlu) sunt oricum tăiate.
 * Umple părintele, care trebuie să fie poziționat și să taie surplusul.
 */
export function TvTrailer({
  videoId,
  stillUrl,
  sound,
}: {
  videoId: string | null;
  stillUrl: string | null;
  sound: boolean;
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
              startedRef.current = true;
              // modulul de subtitrări se reîncarcă la fiecare clip
              e.target.unloadModule?.("captions");
              e.target.unloadModule?.("cc");
              const id = currentIdRef.current;
              revealRef.current = window.setTimeout(() => setPlayingId(id), REVEAL_MS);
            } else if (e.data === YT.PlayerState.ENDED) {
              // bucla: acoperim ecranul de final și o luăm de la capăt
              setPlayingId(null);
              e.target.seekTo(0, true);
              e.target.playVideo();
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
