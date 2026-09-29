/**
 * Măsoară colțurile ecranului luminos dintr-o fotografie a sălii și le scrie
 * în procente, gata de pus în `src/lib/hall-scene.ts`.
 *
 *   node scripts/measure-screen.mjs public/hall/hall-wide.jpg
 *
 * Ecranul este singura suprafață mare, deschisă și neutră (nu caldă) din
 * imagine. Marginile stânga/dreapta se potrivesc cu câte o dreaptă prin
 * rândurile din mijlocul ecranului, ca perspectiva (trapezul) să fie prinsă
 * corect, iar colțurile rotunjite să nu strice măsurătoarea.
 */
import sharp from "sharp";

const file = process.argv[2];
if (!file) {
  console.error("Dă calea imaginii: node scripts/measure-screen.mjs <imagine>");
  process.exit(1);
}

const THRESHOLD = Number(process.env.SCREEN_THRESHOLD ?? 120);

const image = sharp(file);
const { width, height } = await image.metadata();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;

const isScreen = (x, y) => {
  const i = (y * width + x) * ch;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return r > THRESHOLD && g > THRESHOLD && b > THRESHOLD && Math.abs(r - b) < 60 && Math.abs(g - b) < 45;
};

// Rândurile în care ecranul acoperă cel puțin 25% din lățime.
const rowRuns = [];
for (let y = 0; y < height; y++) {
  let count = 0;
  for (let x = 0; x < width; x++) if (isScreen(x, y)) count++;
  rowRuns.push(count);
}
function longestRun(arr, threshold) {
  let best = [0, -1], current = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > threshold) {
      if (!current) current = [i, i];
      else current[1] = i;
    } else {
      if (current && current[1] - current[0] > best[1] - best[0]) best = current;
      current = null;
    }
  }
  if (current && current[1] - current[0] > best[1] - best[0]) best = current;
  return best;
}
const [top, bottom] = longestRun(rowRuns, width * 0.25);

// Marginile stânga/dreapta pe rândurile din mijlocul ecranului (evităm colțurile).
const inset = Math.round((bottom - top) * 0.15);
const lefts = [], rights = [];
for (let y = top + inset; y <= bottom - inset; y++) {
  let l = -1, r = -1;
  for (let x = 0; x < width; x++) if (isScreen(x, y)) { l = x; break; }
  for (let x = width - 1; x >= 0; x--) if (isScreen(x, y)) { r = x; break; }
  if (l >= 0 && r >= 0) { lefts.push([y, l]); rights.push([y, r]); }
}
function fitLine(points) {
  const n = points.length;
  const my = points.reduce((s, p) => s + p[0], 0) / n;
  const mx = points.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, den = 0;
  for (const [y, x] of points) { num += (y - my) * (x - mx); den += (y - my) ** 2; }
  const slope = den === 0 ? 0 : num / den; // x = mx + slope * (y - my)
  return (y) => mx + slope * (y - my);
}
const leftAt = fitLine(lefts);
const rightAt = fitLine(rights);

const pct = (v, total) => +((v / total) * 100).toFixed(2);
const quad = [
  [pct(leftAt(top), width), pct(top, height)],
  [pct(rightAt(top), width), pct(top, height)],
  [pct(rightAt(bottom), width), pct(bottom, height)],
  [pct(leftAt(bottom), width), pct(bottom, height)],
];

console.log(JSON.stringify({ width, height, top, bottom, quad }, null, 2));
