/* eslint-disable @next/next/no-img-element -- imagini mici, fixe, decupate din afișe */
import { DRINKS, NACHOS, POPCORN, SNACKS } from "@/lib/bar-menu";
import { BarKeepAlive } from "@/components/display/bar-keep-alive";

/**
 * Meniul barului pe un singur televizor (1280×720 pe cutie): trei panouri
 * verticale ca trei ecrane alăturate (layoutul de referință), în stilul alb +
 * vișiniu din a doua referință — sus alb cu prețuri pe coloane, jos vișiniu
 * despărțit printr-o curbă. Doar CSS vechi (fără color-mix, inset sau
 * aspect-ratio), ca pe celelalte televizoare.
 */
export function BarBoard() {
  return (
    <div className="bar-root flex h-full w-full gap-[0.7vw] p-[0.7vw]">
      <PopcornPanel />
      <NachosPanel />
      <DrinksPanel />
      <BarKeepAlive />
    </div>
  );
}

function Lei({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`ticket whitespace-nowrap leading-none ${className ?? ""}`}>
      {value}
      <span className="ml-[0.2em] text-[0.55em] tracking-[0.08em]">LEI</span>
    </span>
  );
}

function Title({ children, sub, light = false }: { children: string; sub?: string; light?: boolean }) {
  return (
    <div className="leading-none">
      <h2 className={`bar-title text-[2.6vw] ${light ? "text-white" : "bar-ink"}`}>{children}</h2>
      {sub ? <p className={`mt-[0.6vh] text-[0.95vw] font-semibold ${light ? "bar-on-dark" : "bar-muted"}`}>{sub}</p> : null}
    </div>
  );
}

/* ------------------------------ popcorn ------------------------------ */

function PopcornPanel() {
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.4vw] pb-[5vh] pt-[2.4vh]">
        <Title sub="proaspăt, la fiecare film">Popcorn</Title>

        <div className="mt-[2.6vh] flex items-end justify-end gap-[0.6vw] pr-[0.2vw]">
          {POPCORN.sizes.map((s) => (
            <div key={s.label} className="w-[4.2vw] text-center">
              <span className="bar-badge ticket block rounded-[0.4vw] py-[0.5vh] text-[1.15vw] tracking-[0.1em]">{s.label}</span>
              <span className="bar-muted mt-[0.4vh] block text-[0.8vw] font-semibold">{s.grams}</span>
            </div>
          ))}
        </div>
        <ul className="mt-[1vh] flex flex-col gap-[1.6vh]">
          {POPCORN.rows.map((r) => (
            <li key={r.name} className="flex items-baseline gap-[0.6vw]">
              <span className="bar-ink text-[1.5vw] font-extrabold leading-none">{r.name}</span>
              <span className="bar-dots flex-1" />
              {r.prices.map((p) => (
                <Lei key={p} value={String(p)} className="bar-price w-[4.2vw] text-center text-[2.1vw]" />
              ))}
            </li>
          ))}
        </ul>
        <p className="bar-muted mt-[1.4vh] text-[0.8vw] font-semibold">*{POPCORN.brand}</p>
        <span className="bar-curve" aria-hidden="true" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[1.2vw] pb-[2vh] pt-[1vh]">
        <Title light sub="pungi și cutii la bar">Popcorn gourmet</Title>
        <ul className="mt-[1.6vh] grid min-h-0 flex-1 grid-cols-3 gap-[0.6vw]">
          {POPCORN.gourmet.map((g) => (
            <li key={g.name} className="flex min-h-0 flex-col items-center text-center">
              <div className="relative min-h-0 w-full flex-1">
                <img src={g.image} alt="" className="bar-product" />
              </div>
              <p className="mt-[0.6vh] text-[0.95vw] font-bold leading-tight text-white">{g.name}</p>
              <p className="bar-on-dark text-[0.72vw] font-semibold leading-tight">{g.detail}</p>
              <Lei value={g.price} className="bar-price-dark mt-[0.6vh] text-[2vw]" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------ nachos ------------------------------ */

function NachosPanel() {
  return (
    <section className="bar-panel bar-hero relative flex flex-1 flex-col items-center px-[1.4vw] pb-[2.4vh] pt-[3vh] text-center">
      <p className="ticket bar-on-dark text-[1.1vw] tracking-[0.3em]">CROCANȚI, CU SOS</p>
      <h2 className="bar-title mt-[0.4vh] text-[5.4vw] leading-none text-white">NACHOS</h2>

      <div className="relative mt-[1vh] w-full flex-1">
        <span className="bar-glow" aria-hidden="true" />
        <img src="/bar/nachos.webp" alt="" className="bar-product" />
      </div>

      <ul className="mt-[1.4vh] flex w-full flex-col gap-[1vh]">
        {NACHOS.portions.map((p) => (
          <li key={p.name} className="bar-chip flex items-center justify-between rounded-[0.8vw] px-[1vw] py-[1vh] text-left">
            <span>
              <span className="bar-ink block text-[1.35vw] font-extrabold leading-tight">{p.name}</span>
              <span className="bar-muted block text-[0.75vw] font-semibold">{p.grams}</span>
            </span>
            <Lei value={p.price} className="bar-price text-[2.6vw]" />
          </li>
        ))}
      </ul>

      <div className="mt-[1.6vh] flex w-full items-center gap-[0.8vw] text-left">
        <img src="/bar/sosuri.webp" alt="" className="h-[9vh] w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[1vw] font-bold leading-tight text-white">{NACHOS.sauces.join(" · ")}</p>
          <p className="bar-on-dark text-[0.75vw] font-semibold">extra sos ({NACHOS.extraSauce.grams})</p>
        </div>
        <Lei value={NACHOS.extraSauce.price} className="bar-price-dark text-[2.2vw]" />
      </div>
      <p className="bar-on-dark mt-[1.2vh] text-[0.7vw] font-semibold">*{NACHOS.brands}</p>
    </section>
  );
}

/* ------------------------------ băuturi și gustări ------------------------------ */

function DrinksPanel() {
  const { soft, water } = DRINKS;
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.4vw] pb-[4.6vh] pt-[2.4vh]">
        <div className="flex items-start gap-[0.6vw]">
          <div className="min-w-0 flex-1">
            <div className="flex items-end justify-between gap-[0.6vw]">
              <Title sub={soft.size}>{soft.title}</Title>
              <Lei value={soft.price} className="bar-price text-[2.4vw]" />
            </div>
            <ul className="bar-ink mt-[1.4vh] grid grid-cols-2 gap-x-[0.8vw] gap-y-[0.5vh] text-[0.95vw] font-bold leading-tight">
              {soft.items.map((d) => (
                <li key={d} className="bar-bullet">{d}</li>
              ))}
            </ul>
          </div>
          <img src="/bar/cola.webp" alt="" className="mt-[0.4vh] h-[21vh] w-auto shrink-0" />
        </div>

        <div className="bar-rule mt-[1.6vh] flex items-center gap-[0.6vw] pt-[1.4vh]">
          <img src="/bar/apa.webp" alt="" className="h-[9vh] w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="bar-ink text-[1.5vw] font-extrabold leading-none">
              {water.title} <span className="bar-muted text-[0.85vw] font-semibold">{water.size}</span>
            </p>
            <p className="bar-ink mt-[0.6vh] text-[0.85vw] font-bold leading-snug">{water.items.join(" · ")}</p>
          </div>
          <Lei value={water.price} className="bar-price text-[2.2vw]" />
        </div>
        <span className="bar-curve" aria-hidden="true" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[1.1vw] pb-[1.6vh] pt-[0.6vh]">
        <Title light>Gustări</Title>
        <ul className="mt-[1vh] grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-x-[0.5vw] gap-y-[1vh]">
          {SNACKS.map((s) => (
            <li key={s.name} className="flex min-h-0 flex-col items-center text-center">
              <div className="relative min-h-0 w-full flex-1">
                <img src={s.image} alt="" className="bar-product" />
              </div>
              <p className="mt-[0.3vh] text-[0.82vw] font-bold leading-tight text-white">{s.name}</p>
              <Lei value={s.price} className="bar-price-dark text-[1.5vw]" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
