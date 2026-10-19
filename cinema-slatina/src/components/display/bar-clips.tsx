"use client";

/* eslint-disable @next/next/no-img-element -- cadre mici, fixe, pregătite pentru cutie */
import { useEffect, useRef, useState } from "react";

/** Cât durează trecerea de la un clip la următorul (trebuie să fie egal cu tranziția din .bar-clip). */
const FADE_S = 0.8;

/**
 * Fundal din clipuri scurte, fără sunet (nachos: trei, unul după altul, cu
 * fade; popcorn: unul singur, în buclă). `clips` sunt căile fără extensie:
 * `.mp4` e clipul, `.webp` primul lui cadru. Fiecare clip e descărcat o
 * singură dată la încărcarea paginii și rulează din memorie (blob), deci
 * repetarea nu mai cere nimic de la server. Până se descarcă, sau dacă nu se
 * pot reda, rămân primele cadre ca poze care se schimbă una în alta (doar CSS).
 */
export function BarClips({ clips }: { clips: string[] }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const switching = useRef(false);
  const single = clips.length === 1;

  useEffect(() => {
    let cancelled = false;
    let made: string[] = [];
    Promise.all(
      clips.map((c) =>
        fetch(`${c}.mp4`).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.blob();
        }),
      ),
    )
      .then((blobs) => {
        made = blobs.map((b) => URL.createObjectURL(b));
        if (cancelled) made.forEach((u) => URL.revokeObjectURL(u));
        else setUrls(made);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [clips]);

  // pornește clipul activ de la început; anteriorul se termină singur în fade
  useEffect(() => {
    if (!urls) return;
    const v = videos.current[active];
    if (!v) return;
    switching.current = false;
    v.currentTime = 0;
    v.play().catch(() => setFailed(true));
  }, [urls, active]);

  const onTime = (i: number) => {
    const v = videos.current[i];
    if (single || !v || i !== active || switching.current || !v.duration) return;
    if (v.currentTime >= v.duration - FADE_S) {
      switching.current = true;
      setActive((i + 1) % clips.length);
    }
  };

  const playing = urls !== null && !failed;
  return (
    <>
      {/* rezerva: primele cadre, schimbate din opacitate */}
      <img src={`${clips[0]}.webp`} alt="" className="bar-bg" />
      {!playing ? (
        clips.slice(1, 3).map((c, k) => (
          <img key={c} src={`${c}.webp`} alt="" className={`bar-bg bar-fade-${k + 2}`} />
        ))
      ) : (
        urls.map((u, i) => (
          <video
            key={u}
            ref={(el) => {
              videos.current[i] = el;
            }}
            src={u}
            poster={`${clips[i]}.webp`}
            muted
            loop={single}
            playsInline
            preload="auto"
            onTimeUpdate={() => onTime(i)}
            onEnded={() => onTime(i)}
            className="bar-bg bar-clip"
            style={{ opacity: i === active ? 1 : 0 }}
          />
        ))
      )}
    </>
  );
}
