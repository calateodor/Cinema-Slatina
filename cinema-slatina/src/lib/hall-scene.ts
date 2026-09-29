import { quadBounds, type Quad } from "@/lib/perspective";

/**
 * Scena din prima pagină: fotografia sălii, cu ecranul „viu” montat peste ea.
 *
 * Ecranul este descris prin cele patru colțuri ale lui, în procente din
 * imagine (stânga-sus, dreapta-sus, dreapta-jos, stânga-jos). Ecranul din
 * fotografie e văzut în perspectivă, iar playerul este deformat cu o
 * transformare 3D ca să cadă exact pe acest patrulater. Sunt două cadre: unul
 * lat pentru desktop și unul înalt pentru telefon.
 */
export type HallFrame = {
  src: string;
  /** Colțurile ecranului, în procente din lățimea/înălțimea imaginii. */
  screen: Quad;
};

export type HallScene = { wide: HallFrame; tall: HallFrame };

/*
 * Ambele cadre sunt decupate din aceeași imagine generată cu Nano Banana Pro
 * (sala reală, noaptea, tentă albastră). Colțurile sunt intersecțiile celor
 * patru margini ale pânzei, potrivite ca drepte prin sute de puncte
 * (scripts/measure-screen.mjs, abatere maximă sub 3 px): laturile sunt
 * înclinate cu 2–3°, iar sus și jos coboară ușor spre dreapta (0,4°). Playerul se așază cu câțiva pixeli mai înăuntru (SCREEN_INSET_PX), ca
 * să rămână vizibilă bordura albă a pânzei.
 */
export const SCREEN_INSET_PX = { wide: 6, tall: 4 } as const;
export const HALL_SCENE: HallScene = {
  wide: {
    // decupaj 2100×1312
    src: "/hall/sala-lat-v4.jpg",
    screen: [
      [20.869, 16.083],
      [79.02, 16.8],
      [77.496, 65.713],
      [21.93, 65.055],
    ],
  },
  tall: {
    // decupajul 1417×1536 apropiat cu 10% (1288×1396, centrat pe orizontală,
    // lipit sus), servit la 1100×1192; colțurile sunt cele măsurate pe
    // decupajul întreg, recalculate pentru noul cadru
    src: "/hall/sala-inalt-v5.jpg",
    screen: [
      [2.487, 16.372],
      [97.3, 17.063],
      [94.837, 63.034],
      [4.218, 62.426],
    ],
  },
};

/** Dreptunghiul care cuprinde ecranul, tot în procente. */
export function screenBounds(frame: HallFrame) {
  return quadBounds(frame.screen);
}
