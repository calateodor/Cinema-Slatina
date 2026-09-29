/**
 * Măsoară colțurile pânzei din fotografia sălii și le scrie în procente,
 * gata de pus în `src/lib/hall-scene.ts`.
 *
 *   node scripts/measure-screen.mjs public/hall/sala-lat-v4.jpg
 *
 * Pânza e mult mai luminoasă decât pereții (salt de la ~30 la ~220 pe tonuri
 * de gri). Pentru fiecare latură căutăm saltul pe câteva sute de linii din
 * mijlocul ei (colțurile sunt rotunjite, deci le ocolim), potrivim o dreaptă
 * prin puncte și calculăm colțurile ca intersecții ale celor patru drepte.
 * Așa prindem și înclinarea fiecărei laturi, nu doar un dreptunghi.
 */
import sharp from "sharp";

const file = process.argv[2];
if (!file) {
  console.error("Dă calea imaginii: node scripts/measure-screen.mjs <imagine>");
  process.exit(1);
}
const T = Number(process.env.SCREEN_THRESHOLD ?? 130);

const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const g = (x, y) => data[y * W + x];
const cx = Math.round(W / 2);
const cy = Math.round(H * 0.4);

// Ne asigurăm că punctul de pornire e pe pânză.
if (g(cx, cy) < T) {
  console.error("Centrul ales nu e pe pânză; ajustează cy în script.");
  process.exit(1);
}

/** Din centru spre exterior, primul pixel sub prag (marginea pânzei). */
function edgeAlong(x0, y0, dx, dy) {
  let x = x0, y = y0;
  while (x > 0 && y > 0 && x < W - 1 && y < H - 1 && g(x, y) >= T) {
    x += dx;
    y += dy;
  }
  // mijlocul tranziției, cu precizie de jumătate de pixel
  return [x - dx / 2, y - dy / 2];
}

// Întinderea aproximativă a pânzei, ca să știm ce linii să eșantionăm.
const left0 = edgeAlong(cx, cy, -1, 0)[0];
const right0 = edgeAlong(cx, cy, 1, 0)[0];
const top0 = edgeAlong(cx, cy, 0, -1)[1];
const bottom0 = edgeAlong(cx, cy, 0, 1)[1];

const span = (a, b) => {
  const pad = (b - a) * 0.12; // ocolim colțurile rotunjite
  const out = [];
  for (let v = Math.ceil(a + pad); v <= Math.floor(b - pad); v++) out.push(v);
  return out;
};

const ys = span(top0, bottom0);
const xs = span(left0, right0);
const leftPts = ys.map((y) => [edgeAlong(cx, y, -1, 0)[0], y]);
const rightPts = ys.map((y) => [edgeAlong(cx, y, 1, 0)[0], y]);
const topPts = xs.map((x) => [x, edgeAlong(x, cy, 0, -1)[1]]);
const bottomPts = xs.map((x) => [x, edgeAlong(x, cy, 0, 1)[1]]);

/** Regresie liniară; `vertical` = x în funcție de y. */
function fit(points, vertical) {
  const u = points.map((p) => (vertical ? p[1] : p[0]));
  const v = points.map((p) => (vertical ? p[0] : p[1]));
  const n = u.length;
  const mu = u.reduce((s, a) => s + a, 0) / n;
  const mv = v.reduce((s, a) => s + a, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (u[i] - mu) * (v[i] - mv);
    den += (u[i] - mu) ** 2;
  }
  const slope = den ? num / den : 0;
  const residual = Math.max(...u.map((a, i) => Math.abs(mv + slope * (a - mu) - v[i])));
  return { slope, intercept: mv - slope * mu, residual };
}

const L = fit(leftPts, true); // x = a*y + b
const R = fit(rightPts, true);
const Tp = fit(topPts, false); // y = a*x + b
const B = fit(bottomPts, false);

/** Intersecția dreptei verticale x=a*y+b cu cea orizontală y=c*x+d. */
function meet(vert, hor) {
  const y = (hor.slope * vert.intercept + hor.intercept) / (1 - hor.slope * vert.slope);
  return [vert.slope * y + vert.intercept, y];
}

const corners = [meet(L, Tp), meet(R, Tp), meet(R, B), meet(L, B)];
const pct = ([x, y]) => [+((x / W) * 100).toFixed(3), +((y / H) * 100).toFixed(3)];

console.log(
  JSON.stringify(
    {
      width: W,
      height: H,
      cornersPx: corners.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]),
      quad: corners.map(pct),
      tiltDeg: {
        left: +((Math.atan(L.slope) * 180) / Math.PI).toFixed(2),
        right: +((Math.atan(R.slope) * 180) / Math.PI).toFixed(2),
        top: +((Math.atan(Tp.slope) * 180) / Math.PI).toFixed(2),
        bottom: +((Math.atan(B.slope) * 180) / Math.PI).toFixed(2),
      },
      maxResidualPx: +Math.max(L.residual, R.residual, Tp.residual, B.residual).toFixed(2),
    },
    null,
    1,
  ),
);
