"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  unloadModule?: (name: string) => void;
  destroy: () => void;
};

type YTEvent = { data: number; target: YTPlayer };

type YTNamespace = {
  Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Scriptul YouTube se încarcă o singură dată, oricâte ecrane ar fi pe pagină. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

type Props = {
  videoId: string | null;
  /** Cadrul afișat până pornește trailerul (fundalul filmului sau posterul). */
  stillUrl: string | null;
  title: string;
  muted: boolean;
  onToggleMute: () => void;
  className?: string;
};

/**
 * „Ecranul” sălii: trailerul rulează fără sunet, în buclă, și se schimbă când
 * vizitatorul aduce alt film în față. Până pornește videoclipul se vede cadrul
 * filmului, ca o proiecție oprită pe un stop-cadru.
 */
export function YouTubeScreen({
  videoId,
  stillUrl,
  title,
  muted,
  onToggleMute,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const mutedRef = useRef(muted);
  const currentIdRef = useRef<string | null>(null);
  const revealRef = useRef<number | undefined>(undefined);
  // Ce videoclip rulează efectiv acum. Când se cere alt trailer, `playing`
  // devine fals de la sine, fără să mai fie nevoie de un setState la schimbare.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playing = videoId !== null && playingId === videoId;
  // Dacă browserul blochează pornirea automată (de exemplu iPhone în modul de
  // economisire), după câteva secunde oferim un buton de pornire manuală.
  const [stalled, setStalled] = useState(false);
  // Pauza pusă de vizitator, legată de videoclipul pe care a apăsat. La alt
  // film, `paused` devine fals de la sine și trailerul nou pornește.
  const [pausedId, setPausedId] = useState<string | null>(null);
  const paused = videoId !== null && pausedId === videoId;
  const pausedRef = useRef(false);
  const [volume, setVolume] = useState(80);
  const volumeRef = useRef(80);

  useEffect(() => {
    if (!videoId || playing) return;
    const timer = window.setTimeout(() => setStalled(true), 3500);
    return () => {
      window.clearTimeout(timer);
      setStalled(false);
    };
  }, [videoId, playing]);

  useEffect(() => {
    currentIdRef.current = videoId;
    if (!videoId) return;
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
          // fără subtitrări, nici cele forțate de canal
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
            e.target.setVolume(volumeRef.current);
            if (mutedRef.current) e.target.mute();
            else e.target.unMute();
            e.target.playVideo();
          },
          onStateChange: (e: YTEvent) => {
            // YouTube arată titlul și iconița de play câteva secunde la pornire,
            // chiar și fără comenzi; ținem stop-cadrul peste player până trec.
            window.clearTimeout(revealRef.current);
            if (e.data === YT.PlayerState.PLAYING) {
              // modulul de subtitrări se reîncarcă la fiecare videoclip nou
              e.target.unloadModule?.("captions");
              e.target.unloadModule?.("cc");
              const id = currentIdRef.current;
              revealRef.current = window.setTimeout(() => setPlayingId(id), 2200);
            }
            // O pauză pusă de vizitator lasă cadrul filmului pe ecran; una venită
            // de la browser (fila ascunsă) acoperă interfața YouTube cu
            // stop-cadrul filmului.
            if (e.data === YT.PlayerState.PAUSED && !pausedRef.current) setPlayingId(null);
            if (e.data === YT.PlayerState.ENDED) {
              e.target.seekTo(0, true);
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

  // Când fila redevine vizibilă, trailerul repornește de unde a rămas.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && !pausedRef.current) {
        playerRef.current?.playVideo();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Un film nou pornește mereu, chiar dacă precedentul era pus pe pauză.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const togglePause = () => {
    const player = playerRef.current;
    if (!player || !videoId) return;
    if (paused) {
      setPausedId(null);
      pausedRef.current = false;
      player.playVideo();
    } else {
      setPausedId(videoId);
      pausedRef.current = true;
      player.pauseVideo();
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    volumeRef.current = value;
    playerRef.current?.setVolume(value);
    // Tragerea cursorului înseamnă că vrei sunet: pornește-l dacă era oprit.
    if (value > 0 && muted) onToggleMute();
    if (value === 0 && !muted) onToggleMute();
  };

  useEffect(() => {
    mutedRef.current = muted;
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.mute();
    else player.unMute();
  }, [muted]);

  useEffect(
    () => () => {
      window.clearTimeout(revealRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      {/* Imaginea proiectată (trailerul și stop-cadrul). Stilul de „proiecție”
          (transparență, moliciune) îl primește din exterior, prin clasa
          `projection-media`; butonul de sunet rămâne clar, deasupra. */}
      <div className="projection-media absolute inset-0">
        <div
          ref={mountRef}
          // Playerul e cu 24% mai mare decât ecranul și centrat: bara de titlu,
          // logo-ul și butoanele YouTube cad în afara ramei și sunt tăiate.
          className="absolute inset-0 overflow-hidden [&_iframe]:pointer-events-none [&_iframe]:absolute [&_iframe]:left-[-12%] [&_iframe]:top-[-12%] [&_iframe]:h-[124%] [&_iframe]:w-[124%]"
          aria-hidden="true"
        />

        {/* Stop-cadrul rămâne vizibil până rulează trailerul, apoi se estompează. */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none",
            playing ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          {stillUrl ? (
            <Image
              src={stillUrl}
              alt={`Cadru din ${title}`}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 60vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0d0d10]">
              <p className="display px-6 text-center text-[clamp(1rem,3cqw,2.2rem)] text-foreground/80">
                {title}
              </p>
            </div>
          )}
          {videoId && !playing ? (
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          ) : null}
        </div>
      </div>

      {videoId && !playing && stalled ? (
        <button
          type="button"
          onClick={() => playerRef.current?.playVideo()}
          aria-label={`Pornește trailerul pentru ${title}`}
          className="absolute left-1/2 top-1/2 z-30 flex size-[clamp(3rem,9cqw,5rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-yellow text-brand-ink shadow-[0_0_40px_-4px_rgba(255,222,89,0.7)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/70 motion-reduce:transition-none"
        >
          <Play className="ml-[6%] size-[45%] fill-current" aria-hidden="true" />
        </button>
      ) : null}

      {videoId ? (
        // Comenzile: pauză, sunet și volum. Cursorul de volum se deschide la
        // hover sau când primește focus de la tastatură.
        <div className="group/controls absolute bottom-[3%] right-[2.5%] z-30 flex items-center gap-1 rounded-full bg-black/55 p-1 text-white backdrop-blur-sm">
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? "Pornește trailerul" : "Pune trailerul pe pauză"}
            className="flex size-[clamp(1.9rem,4.4cqw,2.6rem)] items-center justify-center rounded-full transition-colors hover:bg-brand-yellow hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow motion-reduce:transition-none"
          >
            {paused ? (
              <Play className="ml-[6%] size-[50%] fill-current" aria-hidden="true" />
            ) : (
              <Pause className="size-[50%] fill-current" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!muted}
            aria-label={muted ? "Pornește sunetul trailerului" : "Oprește sunetul trailerului"}
            className="flex size-[clamp(1.9rem,4.4cqw,2.6rem)] items-center justify-center rounded-full transition-colors hover:bg-brand-yellow hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow motion-reduce:transition-none"
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-[55%]" aria-hidden="true" />
            ) : volume < 50 ? (
              <Volume1 className="size-[55%]" aria-hidden="true" />
            ) : (
              <Volume2 className="size-[55%]" aria-hidden="true" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volumul trailerului"
            className="w-0 cursor-pointer accent-brand-yellow opacity-0 transition-[width,opacity,margin] duration-300 group-hover/controls:mr-2 group-hover/controls:w-[clamp(4rem,11cqw,7rem)] group-hover/controls:opacity-100 focus-visible:mr-2 focus-visible:w-[clamp(4rem,11cqw,7rem)] focus-visible:opacity-100 motion-reduce:transition-none"
          />
        </div>
      ) : (
        <p className="absolute bottom-[3%] right-[2.5%] z-30 rounded-full bg-black/55 px-3 py-1 text-[clamp(0.6rem,1.4cqw,0.8rem)] text-white/80">
          Trailerul nu este disponibil
        </p>
      )}
    </div>
  );
}
