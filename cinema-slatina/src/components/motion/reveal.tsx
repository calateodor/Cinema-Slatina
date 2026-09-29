"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
// Pe telefon bara de adresă apare/dispare la derulare și schimbă înălțimea
// ferestrei; fără asta, ScrollTrigger ar recalcula tot la fiecare schimbare.
ScrollTrigger.config({ ignoreMobileResize: true });

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Animează pe rând copiii direcți, în loc de întregul bloc. */
  stagger?: boolean;
  delay?: number;
  /** Distanța de pornire, pe verticală. */
  y?: number;
  /**
   * Pentru grilele de carduri: fiecare card apare abia când ajunge el în
   * ecran (rândurile de jos așteaptă derularea), iar cardurile care intră
   * împreună vin pe rând, de jos, cu o ușoară creștere și îndreptare.
   */
  cards?: boolean;
};

/**
 * Apariție discretă la derulare.
 *
 * Folosim `gsap.from`, nu `gsap.to`: conținutul este vizibil în HTML-ul livrat,
 * așa că rămâne lizibil și fără JavaScript. Animăm doar `opacity` și `y`
 * (transform), ca lucrul să rămână pe compozitor. Mișcarea este dezactivată
 * automat pentru utilizatorii care au cerut reducerea animațiilor.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  stagger = false,
  delay = 0,
  y = 24,
  cards = false,
}: Props) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const root = scope.current;
        if (!root) return;

        if (cards) {
          const items = Array.from(root.children) as HTMLElement[];
          if (items.length === 0) return;
          // Apariția „de afiș”: fiecare card se descoperă de jos în sus, ca o
          // cortină care se ridică (clip-path), urcând puțin; posterul din el
          // coboară din zoom mai lent decât rama (parallax), iar orele sar la
          // urmă peste marginea de sus. Marginile negative ale decupajului lasă
          // loc orelor și halo-ului, care ies din card.
          const hidden = "inset(100% -12% -12% -12% round 1.1rem)";
          const shown = "inset(-30% -12% -12% -12% round 1.1rem)";
          gsap.set(items, { clipPath: hidden, y: 56 });
          items.forEach((item) => {
            gsap.set(item.querySelectorAll("img"), { scale: 1.28, yPercent: 6 });
            gsap.set(item.querySelectorAll("[data-reveal-pop]"), { opacity: 0, y: 18, scale: 0.7 });
          });
          ScrollTrigger.batch(items, {
            start: "top 94%",
            once: true,
            onEnter: (batch) => {
              const tl = gsap.timeline();
              (batch as HTMLElement[]).forEach((item, i) => {
                const at = i * 0.12;
                tl.to(
                  item,
                  {
                    clipPath: shown,
                    y: 0,
                    duration: 1.15,
                    ease: "expo.out",
                    force3D: true,
                    clearProps: "clipPath,transform",
                  },
                  at,
                )
                  .to(
                    item.querySelectorAll("img"),
                    { scale: 1, yPercent: 0, duration: 1.5, ease: "expo.out", clearProps: "transform" },
                    at,
                  )
                  .to(
                    item.querySelectorAll("[data-reveal-pop]"),
                    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(2.4)", clearProps: "transform" },
                    at + 0.38,
                  );
              });
            },
          });
          return;
        }

        const targets = stagger
          ? (Array.from(root.children) as HTMLElement[])
          : [root];
        if (targets.length === 0) return;

        gsap.from(targets, {
          opacity: 0,
          y,
          duration: 0.7,
          delay,
          ease: "power2.out",
          stagger: stagger ? 0.08 : 0,
          scrollTrigger: {
            trigger: root,
            start: "top 88%",
            once: true,
          },
        });
      });

      // matchMedia se curăță odată cu contextul useGSAP.
      return () => media.revert();
    },
    { scope },
  );

  return (
    <Tag ref={scope} className={className}>
      {children}
    </Tag>
  );
}
