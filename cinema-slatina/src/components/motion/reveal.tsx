"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Animează pe rând copiii direcți, în loc de întregul bloc. */
  stagger?: boolean;
  delay?: number;
  /** Distanța de pornire, pe verticală. */
  y?: number;
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
}: Props) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const root = scope.current;
        if (!root) return;

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
    <Tag ref={scope} className={cn("[&>*]:will-change-transform", className)}>
      {children}
    </Tag>
  );
}
