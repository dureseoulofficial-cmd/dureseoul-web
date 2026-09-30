import type { ReelController, ReelOptions } from "./dure-reel-types";

// Loads /public/dure-reel.min.js once, however many components ask for it.
// (next/script's onReady fires early for the second instance of the same src, so it is not used here.)

type Engine = { mount(el: HTMLElement, opts?: ReelOptions): ReelController };
const SRC = "/dure-reel.min.js";
let pending: Promise<Engine> | null = null;

export function loadDureReel(): Promise<Engine> {
  if (typeof window === "undefined") return Promise.reject(new Error("DureReel is client-only"));
  if (window.DureReel) return Promise.resolve(window.DureReel);
  if (!pending) {
    pending = new Promise<Engine>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      const script = existing ?? document.createElement("script");
      script.addEventListener("load", () => {
        if (window.DureReel) resolve(window.DureReel);
        else reject(new Error("dure-reel.min.js loaded but window.DureReel is missing"));
      });
      script.addEventListener("error", () => {
        pending = null;
        reject(new Error("failed to load dure-reel.min.js"));
      });
      if (!existing) {
        script.src = SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }
  return pending;
}
