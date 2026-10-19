/* eslint-disable @next/next/no-img-element -- imagini mici, fixe, pregătite pentru cutie */
import { DRINKS, NACHOS, POPCORN, SNACKS, productImage, type BarVariant } from "@/lib/bar-menu";
import { BarKeepAlive } from "@/components/display/bar-keep-alive";
import { NachosVideos } from "@/components/display/nachos-videos";

/**
 * Meniul barului pe un singur televizor (1280×720 pe cutie): trei panouri
 * verticale ca trei ecrane alăturate (layout.jpg), în stilul alb + vișiniu din
 * stil1.jpg — sus alb, jos vișiniu despărțit printr-o curbă; la mijloc nachos
 * pe tot panoul. Prețurile sunt etichete înclinate („stickere”), scrisul e mare,
 * iar gramajul apare doar la popcorn și la nachos. Doar CSS vechi (fără
 * color-mix, inset sau aspect-ratio); singurele animații sunt din opacitate
 * (fundalul de nachos și conturul titlului), pe care le face placa video;
 * fundalul de nachos din varianta foto sunt clipuri scurte (vezi NachosVideos).
 */
export function BarBoard({ variant = "ilustrat" }: { variant?: BarVariant }) {
  return (
    <div className="bar-root flex h-full w-full">
      <PopcornPanel variant={variant} />
      <NachosPanel variant={variant} />
      <DrinksPanel variant={variant} />
      <BarKeepAlive />
    </div>
  );
}

/** Prețul ca etichetă înclinată; `tone`: roșie pe alb, galbenă pe vișiniu. */
function Sticker({
  value,
  tone,
  size,
  tilt = -4,
  className,
}: {
  value: string;
  tone: "red" | "gold";
  size: string;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      className={`bar-sticker ticket inline-block whitespace-nowrap leading-none ${tone === "red" ? "bar-sticker-red" : "bar-sticker-gold"} ${size} ${className ?? ""}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {value}
      <span className="ml-[0.15em] text-[0.48em] tracking-[0.06em]">LEI</span>
    </span>
  );
}

/** Înclinări alternative, ca etichetele să nu stea toate la fel. */
const tiltOf = (i: number) => [-5, 3, -3, 5][i % 4];

/* ------------------------------ popcorn ------------------------------ */

function PopcornPanel({ variant }: { variant: BarVariant }) {
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.2vw] pb-[5.2vh] pt-[2.4vh]">
        <span className="bar-curve" aria-hidden="true" />
        <h2 className="bar-title bar-ink relative whitespace-nowrap text-[4.07vw] leading-none">
          POP<span className="bar-red">CORN</span>
        </h2>

        <div className="relative mt-[1.2vh] min-h-[22vh]">
          {/* popcornul: mare, sub titlu, în spatele scrisului */}
          {variant === "foto" ? (
            <img src="/bar/foto/popcorn.webp" alt="" className="bar-popcorn" />
          ) : null}
          {/* tabel simplu: mărimile (cu gramaj) sus, sortimentele pe rânduri,
              prețurile ca etichete înclinate, toate la fel de mari */}
          <table className="bar-table relative ml-auto w-[64%]">
            <thead>
              <tr>
                <th />
                {POPCORN.sizes.map((s, k) => {
                  const big = k === POPCORN.sizes.length - 1;
                  return (
                    <th key={s.label} className="px-[0.3vw] pb-[1vh] text-center align-bottom">
                      <span className={`bar-red ticket block leading-none tracking-[0.12em] ${big ? "text-[2.31vw]" : "text-[1.43vw]"}`}>
                        {s.label}
                      </span>
                      <span className={`bar-ink block whitespace-nowrap font-extrabold leading-tight ${big ? "text-[2.2vw]" : "text-[1.65vw]"}`}>
                        {s.grams}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {POPCORN.rows.map((r, i) => (
                <tr key={r.name} className="bar-row">
                  <th className="bar-ink bar-halo py-[1.2vh] pr-[0.3vw] text-left text-[1.59vw] font-extrabold leading-tight">{r.name}</th>
                  {r.prices.map((p, j) => (
                    <td key={j} className="px-[0.3vw] py-[1.2vh] text-center">
                      <Sticker value={String(p)} tone="red" size="text-[2.2vw]" tilt={tiltOf(i * 2 + j)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[0.9vw] pb-[1.8vh] pt-[0.2vh]">
        <h3 className="bar-title bar-tilt-title self-center text-[2.53vw] leading-none text-white">GOURMET</h3>
        <ul className="mt-[0.8vh] grid min-h-0 flex-1 grid-cols-3 gap-[0.4vw]">
          {POPCORN.gourmet.map((g, i) => (
            <li key={g.name} className="flex min-h-0 flex-col items-center text-center">
              <div className="relative min-h-0 w-full flex-1">
                <img src={productImage(g.image, variant)} alt="" className="bar-product" />
              </div>
              <p className="mt-[0.6vh] text-[1.16vw] font-extrabold leading-tight text-white">{g.name}</p>
              <p className="bar-gold text-[1.16vw] font-extrabold">{g.grams}</p>
              <Sticker value={g.price} tone="gold" size="mt-[0.6vh] text-[2.42vw]" tilt={tiltOf(i)} />
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
    <section className="bar-panel bar-hero relative flex flex-1 flex-col px-[1.2vw] pb-[2.2vh] pt-[2.6vh]">
      {variant === "foto" ? (
        // trei clipuri care trec unul în altul (doar opacitate), rulate din memorie
        <div className="tv-layer" aria-hidden="true">
          <NachosVideos />
          <span className="bar-shade" />
        </div>
      ) : null}

      {/* „ALEGE NACHOS”: alb cu contur închis pe umbra de sus; peste el, un
          contur galben care pulsează (strat separat, animat doar din opacitate) */}
      <div className="relative mt-[5vh] text-center">
        <p className="bar-kicker ticket text-[3.3vw] leading-none tracking-[0.3em]">ALEGE</p>
        <h2 className="relative mt-[0.2vh] text-[6.6vw] leading-[0.95]">
          {/* glow-ul stă în spatele literelor: se vede doar în jurul lor */}
          <span className="bar-title bar-pulse-outline block" aria-hidden="true">
            NACHOS
          </span>
          <span className="bar-title bar-shout bar-heavy relative block text-white">NACHOS</span>
        </h2>
        {/* subliniere ca o tușă de pensulă galbenă */}
        <svg className="bar-swoosh" viewBox="0 0 300 34" preserveAspectRatio="none" aria-hidden="true">
          <path d="M8 24 C 70 10, 180 6, 292 16" stroke="#3a0711" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M8 22 C 70 8, 180 4, 292 14" stroke="#ffde59" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M40 27 C 110 18, 200 16, 270 22" stroke="#ffde59" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {variant === "foto" ? (
        <div className="flex-1" />
      ) : (
        <div className="relative mt-[1vh] w-full flex-1">
          <span className="bar-glow" aria-hidden="true" />
          <img src="/bar/nachos.webp" alt="" className="bar-product" />
        </div>
      )}

      <ul className="relative flex w-full flex-col gap-[1.4vh]">
        {NACHOS.portions.map((p, i) => (
          <li key={p.name} className="bar-chip flex items-center justify-between rounded-[0.9vw] py-[1vh] pl-[1vw] pr-[0.6vw]">
            <span>
              <span className="bar-ink block text-[1.98vw] font-extrabold leading-tight">{p.name}</span>
              <span className="bar-red block text-[1.26vw] font-extrabold">{p.grams}</span>
            </span>
            <Sticker value={p.price} tone="red" size="text-[3.3vw]" tilt={tiltOf(i + 1)} />
          </li>
        ))}
      </ul>

      <div className="bar-sauce relative mt-[1.4vh] flex items-center gap-[0.6vw] rounded-[0.9vw] py-[0.8vh] pl-[0.6vw] pr-[0.6vw]">
        {variant === "foto" ? (
          <span className="flex shrink-0 items-center">
            <img src="/bar/foto/cheese-dip.webp" alt="" className="h-[8.5vh] w-auto" />
            <img src="/bar/foto/salsa.webp" alt="" className="-ml-[1.2vw] h-[8.5vh] w-auto" />
          </span>
        ) : (
          <img src="/bar/sosuri.webp" alt="" className="h-[8.5vh] w-auto shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[1.59vw] font-extrabold leading-tight text-white">Extra sos</span>
          <span className="bar-gold block text-[1.16vw] font-bold leading-tight">
            {NACHOS.sauces.join(" · ")} · {NACHOS.extraSauce.grams}
          </span>
        </span>
        <Sticker value={NACHOS.extraSauce.price} tone="gold" size="text-[2.64vw]" tilt={4} />
      </div>
    </section>
  );
}

/* ------------------------------ băuturi și gustări ------------------------------ */

function DrinksPanel({ variant }: { variant: BarVariant }) {
  const { soft, water } = DRINKS;
  return (
    <section className="bar-panel flex flex-1 flex-col">
      <div className="bar-white relative px-[1.2vw] pb-[4.8vh] pt-[2.4vh]">
        <span className="bar-curve" aria-hidden="true" />
        <img src={variant === "foto" ? "/bar/foto/cola.webp" : "/bar/cola.webp"} alt="" className="bar-cola" />
        <div className="relative pl-[8.4vw]">
          <h2 className="bar-title bar-ink text-[2.55vw] leading-none">RĂCORITOARE</h2>
          <Sticker value={soft.price} tone="red" size="mt-[1vh] text-[3.08vw]" tilt={-4} />
          <ul className="bar-ink mt-[1.2vh] grid grid-cols-2 gap-x-[0.35vw] gap-y-[0.4vh] whitespace-nowrap text-[1.02vw] font-bold leading-tight">
            {soft.items.map((d) => (
              <li key={d} className="bar-bullet">{d}</li>
            ))}
          </ul>
        </div>

        <div className="bar-rule relative mt-[1.4vh] flex items-center justify-between gap-[0.6vw] pr-[0.4vw] pt-[1.2vh]">
          <span>
            <span className="bar-ink block text-[1.59vw] font-extrabold leading-tight">{water.title}</span>
            <span className="bar-ink block text-[1.21vw] font-bold">{water.items.join(" · ")}</span>
          </span>
          <Sticker value={water.price} tone="red" size="text-[2.64vw]" tilt={4} />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-[0.9vw] pb-[1.6vh] pt-[0.2vh]">
        <h3 className="bar-title bar-tilt-title self-center text-[2.53vw] leading-none text-white">GUSTĂRI</h3>
        <ul className="mt-[0.8vh] grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-x-[0.4vw] gap-y-[0.8vh]">
          {SNACKS.map((s, i) => (
            <li key={s.name} className={`flex min-h-0 flex-col items-center text-center ${s.image === "ochelari" ? "relative z-10" : ""}`}>
              <div className="relative min-h-0 w-full flex-1">
                <img
                  src={productImage(s.image, variant)}
                  alt=""
                  className={s.image === "ochelari" ? "bar-product bar-glasses" : "bar-product"}
                />
              </div>
              <p className="mt-[0.3vh] text-[1.08vw] font-extrabold leading-tight text-white">{s.name}</p>
              <Sticker value={s.price} tone="gold" size="mt-[0.3vh] text-[1.76vw]" tilt={tiltOf(i)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
