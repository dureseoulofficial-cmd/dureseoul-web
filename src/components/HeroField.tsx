"use client";

import Script from "next/script";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// The Seoul field: 9,400 dots (1 dot = 1,000 people) burst, settle into the city,
// and keep matching in pairs. Pure canvas, no video, no web fonts.
// Engine: /public/dure-reel.js (readable) → /public/dure-reel.min.js (served).

type ReelController = {
  play(): void;
  pause(): void;
  destroy(): void;
  readonly playing: boolean;
};

type ReelOptions = {
  text?: boolean;
  hud?: boolean;
  lockup?: boolean;
  contact?: boolean;
  fit?: "contain" | "cover";
  loop?: "idle" | "hold" | "restart";
  speed?: number;
  particles?: number;
  maxScale?: number;
  grain?: boolean;
  ink?: string;
  paper?: string;
  autoplay?: boolean;
  reducedMotion?: "auto" | "ignore";
};

declare global {
  interface Window {
    DureReel?: { mount(el: HTMLElement, opts?: ReelOptions): ReelController };
  }
}

const FADE_DISTANCE = 0.9; // of viewport height: the field is gone by the time section 01 arrives

export default function HeroField() {
  const host = useRef<HTMLDivElement>(null);
  const ctl = useRef<ReelController | null>(null);
  const [engineReady, setEngineReady] = useState(false);
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

  // Mount the engine once its script is on the page.
  useEffect(() => {
    if (!engineReady || !host.current || !window.DureReel) return;
    const small = window.matchMedia("(max-width: 640px)").matches;
    const controller = window.DureReel.mount(host.current, {
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
    ctl.current = controller;
    return () => {
      controller.destroy();
      ctl.current = null;
    };
  }, [engineReady]);

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
    <>
      <motion.div
        ref={host}
        aria-hidden
        style={{ opacity }}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      <Script src="/dure-reel.min.js" strategy="afterInteractive" onReady={() => setEngineReady(true)} />
    </>
  );
}
