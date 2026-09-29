/**
 * Proiecție 2D → 2D (omografie) exprimată ca `matrix3d`, ca un element
 * dreptunghiular să fie „lipit” peste un patrulater oarecare — de exemplu
 * ecranul din fotografia sălii, văzut în perspectivă.
 *
 * Adaptare a metodei clasice cu adjuncta matricei 3×3 (Franklin Ta).
 * Punctele se dau în ordinea: stânga-sus, dreapta-sus, dreapta-jos, stânga-jos.
 */
export type Point = readonly [number, number];
export type Quad = readonly [Point, Point, Point, Point];

type M3 = number[];

function adjugate(m: M3): M3 {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function multiply(a: M3, b: M3): M3 {
  const out: M3 = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[3 * i + k] * b[3 * k + j];
      out[3 * i + j] = sum;
    }
  }
  return out;
}

function multiplyVector(m: M3, v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Matricea care duce baza canonică în cele patru puncte date. */
function basisToPoints(p1: Point, p2: Point, p3: Point, p4: Point): M3 {
  const m: M3 = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1];
  const v = multiplyVector(adjugate(m), [p4[0], p4[1], 1]);
  return multiply(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/**
 * `matrix3d(...)` care mapează dreptunghiul (0,0)–(width,height) al unui
 * element (cu `transform-origin: 0 0`) pe patrulaterul `target`, dat în
 * pixeli față de același colț stânga-sus.
 */
export function matrix3dForQuad(width: number, height: number, target: Quad): string {
  const source = basisToPoints([0, 0], [width, 0], [width, height], [0, height]);
  const destination = basisToPoints(target[0], target[1], target[2], target[3]);
  const h = multiply(destination, adjugate(source)).map((n, _, all) => n / all[8]);

  // 3×3 → 4×4, în ordinea „column-major” cerută de CSS.
  const m = [
    h[0], h[3], 0, h[6],
    h[1], h[4], 0, h[7],
    0, 0, 1, 0,
    h[2], h[5], 0, h[8],
  ];
  return `matrix3d(${m.map((n) => n.toFixed(6)).join(",")})`;
}

/** Dreptunghiul care cuprinde patrulaterul. */
export function quadBounds(quad: Quad) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}
