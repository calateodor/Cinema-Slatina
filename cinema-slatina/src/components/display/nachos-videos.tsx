"use client";

/* eslint-disable @next/next/no-img-element -- cadre mici, fixe, pregătite pentru cutie */
import { useEffect, useRef, useState } from "react";

/** Clipurile de pe fundalul cu nachos (6 s fiecare, fără sunet, ~1 MB toate). */
const CLIPS = ["/bar/foto/nachos-v1", "/bar/foto/nachos-v2", "/bar/foto/nachos-v3"];
/** Cât durează trecerea de la un clip la următorul (trebuie să fie egal cu tranziția din .bar-clip). */
const FADE_S = 0.8;

/**
 * Fundalul panoului cu nachos: cele trei clipuri unul după altul, cu fade.
 * Fiecare clip e descărcat o singură dată la încărcarea paginii și rulează
 * din memorie (blob), deci repetarea nu mai cere nimic de la server. Până
 * se descarcă, sau dacă nu se pot reda, rămân primele cadre ca poze care
 * se schimbă una în alta (doar CSS).
 */
export function NachosVideos() {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const switching = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let made: string[] = [];
    Promise.all(
      CLIPS.map((c) =>
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
  }, []);

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
    if (!v || i !== active || switching.current || !v.duration) return;
    if (v.currentTime >= v.duration - FADE_S) {
      switching.current = true;
      setActive((i + 1) % CLIPS.length);
    }
  };

  const playing = urls !== null && !failed;
  return (
    <>
      {/* rezerva: primele cadre, schimbate din opacitate */}
      <img src={`${CLIPS[0]}.webp`} alt="" className="bar-bg" />
      {!playing ? (
        <>
          <img src={`${CLIPS[1]}.webp`} alt="" className="bar-bg bar-fade-2" />
          <img src={`${CLIPS[2]}.webp`} alt="" className="bar-bg bar-fade-3" />
        </>
      ) : (
        urls.map((u, i) => (
          <video
            key={u}
            ref={(el) => {
              videos.current[i] = el;
            }}
            src={u}
            poster={`${CLIPS[i]}.webp`}
            muted
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
