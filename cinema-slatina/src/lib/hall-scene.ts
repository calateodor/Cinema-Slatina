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
 * (sala reală, noaptea, tentă albastră). Colțurile sunt marginile exterioare
 * ale pânzei, citite pe zoom la nivel de pixel; ecranul e ușor mai îngust la
 * bază. Playerul se așază cu câțiva pixeli mai înăuntru (SCREEN_INSET_PX), ca
 * să rămână vizibilă bordura albă a pânzei.
 */
export const SCREEN_INSET_PX = { wide: 6, tall: 4 } as const;
export const HALL_SCENE: HallScene = {
  wide: {
    // decupaj 2100×1312
    src: "/hall/sala-lat-v4.jpg",
    screen: [
      [20.86, 16.0],
      [78.9, 16.0],
      [77.76, 65.17],
      [21.81, 65.17],
    ],
  },
  tall: {
    // decupaj 1417×1536
    src: "/hall/sala-inalt-v4.jpg",
    screen: [
      [6.85, 14.84],
      [92.87, 14.84],
      [91.18, 56.84],
      [8.26, 56.84],
    ],
  },
};

/** Dreptunghiul care cuprinde ecranul, tot în procente. */
export function screenBounds(frame: HallFrame) {
  return quadBounds(frame.screen);
}
