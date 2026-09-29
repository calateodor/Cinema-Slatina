"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
   Cursor Grid — port după react-bits (reactbits.dev/animations/cursor-grid),
   folosit ca fundal al site-ului.

   O rețea fină de pătrate, abia vizibilă, se aprinde în galbenul siglei în
   jurul cursorului și se stinge lent în urma lui; un click trimite un val care
   se întinde peste toată pagina. Diferența față de original: canvas-ul stă
   fix, în spatele paginii, și nu primește clickuri, așa că ascultă mișcarea
   pe toată fereastra, nu doar pe el.
--------------------------------------------------------------------------- */

const FALLOFF = (t: number) => t * t * (3 - 2 * t); // „smooth”

type Options = {
  cellSize: number;
  color: [number, number, number];
  radius: number;
  holdTime: number;
  fadeDuration: number;
  lineWidth: number;
  maxOpacity: number;
  fillOpacity: number;
  gridOpacity: number;
  cellRadius: number;
  pulseSpeed: number;
};

const OPTIONS: Options = {
  cellSize: 64,
  color: [255, 222, 89], // #FFDE59
  radius: 150,
  holdTime: 350,
  fadeDuration: 900,
  lineWidth: 1.1,
  maxOpacity: 0.55,
  fillOpacity: 0.05,
  gridOpacity: 0.028,
  cellRadius: 6,
  pulseSpeed: 700,
};

export function CursorGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = OPTIONS;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const [cr, cg, cb] = p.color;

    let cols = 0, rows = 0, offX = 0, offY = 0, w = 0, h = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    const pulses: { x: number; y: number; t0: number }[] = [];
    let raf = 0;
    let running = false;
    let lastFrame = 0;

    const rebuild = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / p.cellSize) + 1;
      rows = Math.ceil(h / p.cellSize) + 1;
      offX = (w - cols * p.cellSize) / 2;
      offY = (h - rows * p.cellSize) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
    };

    const cellCenter = (i: number): [number, number] => [
      offX + (i % cols) * p.cellSize + p.cellSize / 2,
      offY + Math.floor(i / cols) * p.cellSize + p.cellSize / 2,
    ];

    const energize = (x: number, y: number) => {
      const r = p.radius;
      const now = performance.now();
      const minCol = Math.max(0, Math.floor((x - r - offX) / p.cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / p.cellSize));
      const minRow = Math.max(0, Math.floor((y - r - offY) / p.cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / p.cellSize));
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const i = row * cols + col;
          const [cx, cy] = cellCenter(i);
          const dist = Math.hypot(cx - x, cy - y);
          if (dist > r) continue;
          const level = FALLOFF(1 - dist / r) * p.maxOpacity;
          if (level > alphas[i]) {
            alphas[i] = level;
            touched[i] = now;
          } else if (level > 0) {
            touched[i] = now;
          }
        }
      }
    };

    const drawLattice = () => {
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.gridOpacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let col = 0; col <= cols; col++) {
        const x = Math.round(offX + col * p.cellSize) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let row = 0; row <= rows; row++) {
        const y = Math.round(offY + row * p.cellSize) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    };

    const draw = (now: number) => {
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      drawLattice();

      // valurile de la click dau energie celulelor peste care trec
      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        const ringR = ((now - pulse.t0) / 1000) * p.pulseSpeed;
        if (ringR > Math.hypot(w, h)) {
          pulses.splice(pi, 1);
          continue;
        }
        const band = p.cellSize;
        const minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / p.cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / p.cellSize));
        const minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / p.cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / p.cellSize));
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const i = row * cols + col;
            const [cx, cy] = cellCenter(i);
            const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
            if (Math.abs(dist - ringR) < band / 2 && p.maxOpacity * 0.8 > alphas[i]) {
              alphas[i] = p.maxOpacity * 0.8;
              touched[i] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = dt / Math.max(p.fadeDuration, 16);
      const half = p.cellSize / 2;

      for (let i = 0; i < alphas.length; i++) {
        let a = alphas[i];
        if (a <= 0) continue;
        if (now - touched[i] > p.holdTime) {
          a = Math.max(0, a - fadeStep);
          alphas[i] = a;
          if (a <= 0) continue;
        }
        anyVisible = true;

        const [cx, cy] = cellCenter(i);
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize);
        gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

        ctx.beginPath();
        ctx.roundRect(cx - half + 0.5, cy - half + 0.5, p.cellSize - 1, p.cellSize - 1, p.cellRadius);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * p.fillOpacity})`;
        ctx.fill();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = p.lineWidth;
        ctx.stroke();
      }

      if (anyVisible) raf = requestAnimationFrame(draw);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      energize(e.clientX, e.clientY);
      wake();
    };
    const onDown = (e: PointerEvent) => {
      pulses.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      wake();
    };
    const onResize = () => {
      rebuild();
      wake();
    };

    rebuild();
    wake();
    window.addEventListener("resize", onResize);
    // Cu mișcare redusă rămâne doar rețeaua fixă, fără lumini și valuri.
    if (!reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden="true" />;
}
