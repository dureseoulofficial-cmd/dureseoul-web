"use client";

import { useEffect, useRef } from "react";
import { loadDureReel } from "./dure-reel-loader";
import type { ReelController } from "./dure-reel-types";

// Section 03: the settled Seoul field with matches happening one pair at a time,
// each labelled with who needs what and who has lived it. Same engine as the hero,
// opened straight on the city (startAt) instead of replaying the burst.

export default function SeoulAtlas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let ctl: ReelController | null = null;
    loadDureReel()
      .then((engine) => {
        if (cancelled || !host.current) return;
        const small = window.matchMedia("(max-width: 768px)").matches;
        ctl = engine.mount(host.current, {
          text: false,
          hud: false,
          lockup: false,
          contact: false,
          grain: false,
          fit: "cover",
          loop: "idle",
          startAt: 22, // open on the settled city; matching is already under way
          matchLabels: !small, // chips need room to stay readable
          pulse: false, // no ring pulses: lines, chips and twinkle only
          particles: small ? 5000 : 9400,
          maxScale: 1.5,
          ink: "#070709",
          paper: "#f4f4f5",
        });
      })
      .catch(() => {
        /* the section still reads without the field */
      });
    return () => {
      cancelled = true;
      ctl?.destroy();
    };
  }, []);

  return (
    <figure className="m-0 mt-12 md:mt-16">
      <div
        ref={host}
        aria-hidden
        className="relative w-full aspect-[16/10] md:aspect-[2/1] overflow-hidden border border-border bg-bg"
      />
      <figcaption className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2 text-[11px] font-mono tracking-widest uppercase text-muted">
        <span>Seoul · 9,400 nodes · 1 node = 1,000 people</span>
        <span>매칭은 한 쌍씩, 계속됩니다</span>
      </figcaption>
    </figure>
  );
}
