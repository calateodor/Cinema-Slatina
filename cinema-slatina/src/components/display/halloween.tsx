/* eslint-disable @next/next/no-img-element -- imagini mici, fixe, fără optimizare */

/**
 * Tema de Halloween a afișajului (deocamdată doar pe /halloween, de probă).
 * Imaginile sunt pregătite din D:\Teo\Site Cinema\Halloween la mărimea
 * ecranului cutiilor, în public/teme/halloween (toate împreună sub 100 KB).
 * Tot ce se mișcă e doar `transform`, pe care îl face placa video.
 */

/** Doi păianjeni (negri și albi) care se lasă pe fir o dată la 10 secunde. */
export function HalloweenSpiders() {
  return (
    <div className="tv-layer pointer-events-none z-30" aria-hidden="true">
      <img src="/teme/halloween/paianjeni-negri.webp" alt="" className="tv-spider tv-spider-left" />
      <img src="/teme/halloween/paianjeni-albi.webp" alt="" className="tv-spider tv-spider-right" />
    </div>
  );
}

/** Ghirlandele de pe marginile televizoarelor sălilor. */
export function HalloweenFrame() {
  return (
    <div className="tv-layer pointer-events-none" aria-hidden="true">
      <span className="tv-hw-side tv-hw-left" />
      <span className="tv-hw-side tv-hw-right" />
      <span className="tv-hw-edge tv-hw-top" />
      <span className="tv-hw-edge tv-hw-bottom" />
    </div>
  );
}
