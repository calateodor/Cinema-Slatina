/* eslint-disable @next/next/no-img-element -- imagini mici, fixe, pregătite pentru cutie */
import { DRINKS, NACHOS, POPCORN, SNACKS, productImage, type BarVariant } from "@/lib/bar-menu";
import { BarKeepAlive } from "@/components/display/bar-keep-alive";

/**
 * Meniul barului pe un singur televizor (1280×720 pe cutie): trei panouri
 * verticale ca trei ecrane alăturate (layout.jpg), în stilul alb + vișiniu din
 * stil1.jpg — sus alb cu prețuri pe coloane, jos vișiniu despărțit printr-o
 * curbă; la mijloc nachos pe tot panoul. Scris mare, fără mărunțișuri: gramajul
 * apare doar la popcorn și la nachos. Doar CSS vechi (fără color-mix, inset sau
 * aspect-ratio) și animații doar din opacitate, ca pe celelalte televizoare.
 */
export function BarBoard({ variant = "ilustrat" }: { variant?: BarVariant }) {
  return (
    <div className="bar-root flex h-full w-full gap-[0.7vw] p-[0.7vw]">
      <PopcornPanel variant={variant} />
      <NachosPanel variant={variant} />
      <DrinksPanel variant={variant} />
      <BarKeepAlive />
    </div>
  );
}

function Lei({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`ticket whitespace-nowrap leading-none ${className ?? ""}`}>
      {value}
      <span className="ml-[0.18em] text-[0.5em] tracking-[0.08em]">LEI</span>
    </span>
  );
}

/* ------------------------------ popcorn ------------------------------ */

function PopcornPanel({ variant }: { variant: BarVariant }) {
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.3vw] pb-[5vh] pt-[2.6vh]">
        {variant === "foto" ? <img src="/bar/foto/popcorn.webp" alt="" className="bar-popcorn" /> : null}
        <h2 className="bar-title bar-ink relative text-[3.4vw] leading-none">POPCORN</h2>

        <div className="relative mt-[5.6vh] flex items-end justify-end gap-[0.5vw]">
          {POPCORN.sizes.map((s) => (
            <div key={s.label} className="w-[5vw] text-center">
              <span className="bar-badge ticket block rounded-[0.5vw] py-[0.6vh] text-[1.5vw] tracking-[0.08em]">{s.label}</span>
              <span className="bar-ink mt-[0.5vh] block text-[1.05vw] font-bold">{s.grams}</span>
            </div>
          ))}
        </div>
        <ul className="relative mt-[1.2vh] flex flex-col gap-[1.8vh]">
          {POPCORN.rows.map((r) => (
            <li key={r.name} className="flex items-baseline gap-[0.5vw]">
              <span className="bar-ink text-[1.75vw] font-extrabold leading-none">{r.name}</span>
              <span className="bar-dots flex-1" />
              {r.prices.map((p) => (
                <Lei key={p} value={String(p)} className="bar-price w-[5vw] text-center text-[2.7vw]" />
              ))}
            </li>
          ))}
        </ul>
        <span className="bar-curve" aria-hidden="true" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[1vw] pb-[2vh] pt-[0.4vh]">
        <h3 className="bar-title text-[2.2vw] leading-none text-white">GOURMET</h3>
        <ul className="mt-[1.2vh] grid min-h-0 flex-1 grid-cols-3 gap-[0.5vw]">
          {POPCORN.gourmet.map((g) => (
            <li key={g.name} className="flex min-h-0 flex-col items-center text-center">
              <div className="relative min-h-0 w-full flex-1">
                <img src={productImage(g.image, variant)} alt="" className="bar-product" />
              </div>
              <p className="mt-[0.8vh] text-[1.05vw] font-extrabold leading-tight text-white">{g.name}</p>
              <p className="bar-gold text-[1vw] font-bold">{g.grams}</p>
              <Lei value={g.price} className="bar-price-dark mt-[0.4vh] text-[2.5vw]" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------ nachos ------------------------------ */

function NachosPanel({ variant }: { variant: BarVariant }) {
  return (
    <section className="bar-panel bar-hero relative flex flex-1 flex-col px-[1.3vw] pb-[2.4vh] pt-[3vh]">
      {variant === "foto" ? (
        // trei fotografii care se schimbă una în alta (doar opacitate)
        <div className="tv-layer" aria-hidden="true">
          <img src="/bar/foto/nachos-1.webp" alt="" className="bar-bg" />
          <img src="/bar/foto/nachos-2.webp" alt="" className="bar-bg bar-fade-2" />
          <img src="/bar/foto/nachos-3.webp" alt="" className="bar-bg bar-fade-3" />
          <span className="bar-shade" />
        </div>
      ) : null}

      {/* „ALEGE NACHOS”: alb pe umbra închisă de sus, cu contur, ca să se citească pe orice poză */}
      <div className="relative text-center">
        <p className="bar-kicker ticket text-[2.6vw] leading-none tracking-[0.32em]">ALEGE</p>
        <h2 className="bar-title bar-shout text-[6.2vw] leading-[0.95] text-white">NACHOS</h2>
      </div>

      {variant === "foto" ? (
        <div className="flex-1" />
      ) : (
        <div className="relative mt-[1vh] w-full flex-1">
          <span className="bar-glow" aria-hidden="true" />
          <img src="/bar/nachos.webp" alt="" className="bar-product" />
        </div>
      )}

      <ul className="relative flex w-full flex-col gap-[1.2vh]">
        {NACHOS.portions.map((p) => (
          <li key={p.name} className="bar-chip flex items-center justify-between rounded-[0.9vw] px-[1vw] py-[1.1vh]">
            <span>
              <span className="bar-ink block text-[1.7vw] font-extrabold leading-tight">{p.name}</span>
              <span className="bar-price block text-[1.05vw] font-bold">{p.grams}</span>
            </span>
            <Lei value={p.price} className="bar-price text-[3.3vw]" />
          </li>
        ))}
      </ul>

      <div className="bar-sauce relative mt-[1.2vh] flex items-center gap-[0.6vw] rounded-[0.9vw] px-[0.8vw] py-[0.8vh]">
        {variant === "foto" ? (
          <span className="flex shrink-0 items-center">
            <img src="/bar/foto/cheese-dip.webp" alt="" className="h-[8vh] w-auto" />
            <img src="/bar/foto/salsa.webp" alt="" className="-ml-[1vw] h-[8vh] w-auto" />
          </span>
        ) : (
          <img src="/bar/sosuri.webp" alt="" className="h-[8vh] w-auto shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[1.35vw] font-extrabold leading-tight text-white">Extra sos</span>
          <span className="bar-gold block text-[1vw] font-bold leading-tight">
            {NACHOS.sauces.join(" · ")} · {NACHOS.extraSauce.grams}
          </span>
        </span>
        <Lei value={NACHOS.extraSauce.price} className="bar-price-dark text-[2.8vw]" />
      </div>
    </section>
  );
}

/* ------------------------------ băuturi și gustări ------------------------------ */

function DrinksPanel({ variant }: { variant: BarVariant }) {
  const { soft, water } = DRINKS;
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.3vw] pb-[4.8vh] pt-[2.6vh]">
        <img src={variant === "foto" ? "/bar/foto/cola.webp" : "/bar/cola.webp"} alt="" className="bar-cola" />
        <div className="relative pr-[6.5vw]">
          <h2 className="bar-title bar-ink text-[2.7vw] leading-none">{soft.title.toUpperCase()}</h2>
          <Lei value={soft.price} className="bar-price mt-[0.8vh] block text-[3vw]" />
          <ul className="bar-ink mt-[1.2vh] grid grid-cols-2 gap-x-[0.5vw] gap-y-[0.5vh] text-[0.98vw] font-bold leading-tight whitespace-nowrap">
            {soft.items.map((d) => (
              <li key={d} className="bar-bullet">{d}</li>
            ))}
          </ul>
        </div>

        <div className="bar-rule relative mt-[1.6vh] flex items-center justify-between gap-[0.6vw] pt-[1.3vh]">
          <span>
            <span className="bar-ink block text-[1.45vw] font-extrabold leading-tight">{water.title}</span>
            <span className="bar-ink block text-[1.12vw] font-bold">{water.items.join(" · ")}</span>
          </span>
          <Lei value={water.price} className="bar-price text-[2.6vw]" />
        </div>
        <span className="bar-curve" aria-hidden="true" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[1vw] pb-[1.6vh] pt-[0.2vh]">
        <h3 className="bar-title text-[2.2vw] leading-none text-white">GUSTĂRI</h3>
        <ul className="mt-[1vh] grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-x-[0.4vw] gap-y-[1vh]">
          {SNACKS.map((s) => (
            <li key={s.name} className="flex min-h-0 flex-col items-center text-center">
              <div className="relative min-h-0 w-full flex-1">
                <img src={productImage(s.image, variant)} alt="" className="bar-product" />
              </div>
              <p className="mt-[0.3vh] text-[0.98vw] font-extrabold leading-tight text-white">{s.name}</p>
              <Lei value={s.price} className="bar-price-dark text-[2vw]" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
