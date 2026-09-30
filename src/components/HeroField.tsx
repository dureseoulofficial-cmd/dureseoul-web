"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { loadDureReel } from "./dure-reel-loader";
import type { ReelController } from "./dure-reel-types";

// The Seoul field: 9,400 dots (1 dot = 1,000 people) burst, settle into the city,
// and keep matching in pairs. Pure canvas, no video, no web fonts.
// Engine: /public/dure-reel.js (readable) → /public/dure-reel.min.js (served).

const FADE_DISTANCE = 0.9; // of viewport height: the field is gone by the time section 01 arrives

export default function HeroField() {
  const host = useRef<HTMLDivElement>(null);
  const ctl = useRef<ReelController | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [fadeEnd, setFadeEnd] = useState(800);
  const opacity = useTransform(scrollY, [0, fadeEnd], [1, 0]);

  useEffect(() => {
    const update = () => setFadeEnd(Math.max(320, window.innerHeight * FADE_DISTANCE));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDureReel()
      .then((engine) => {
        if (cancelled || !host.current) return;
        const small = window.matchMedia("(max-width: 640px)").matches;
        ctl.current = engine.mount(host.current, {
          text: false, // the page's own headline does the talking
          hud: false,
          lockup: false,
          contact: false,
          fit: "cover",
          loop: "idle",
          speed: 15 / 22,
          particles: small ? 5000 : 9400,
          maxScale: 1.5,
          grain: false, // the page already has its noise overlay
          ink: "#070709", // match --color-bg so the canvas edge disappears
          paper: "#f4f4f5",
        });
      })
      .catch(() => {
        /* the hero still reads without the field */
      });
    return () => {
      cancelled = true;
      ctl.current?.destroy();
      ctl.current = null;
    };
  }, []);

  // Do not spend frames on a field nobody can see.
  useMotionValueEvent(scrollY, "change", (y) => {
    const c = ctl.current;
    if (!c || shouldReduceMotion) return;
    if (y > fadeEnd) {
      if (c.playing) c.pause();
    } else if (!c.playing) {
      c.play();
    }
  });

  return (
    <motion.div
      ref={host}
      aria-hidden
      style={{ opacity }}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
