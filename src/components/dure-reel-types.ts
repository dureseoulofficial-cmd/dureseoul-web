// Types for the DureReel canvas engine served from /public/dure-reel.min.js.
// Readable source: /public/dure-reel.js (option docs in its header comment).

export type ReelOptions = {
  speed?: number;
  text?: boolean;
  hud?: boolean;
  lockup?: boolean;
  contact?: boolean;
  fit?: "contain" | "cover";
  loop?: "idle" | "hold" | "restart";
  particles?: number;
  autoplay?: boolean;
  maxScale?: number;
  grain?: boolean;
  ink?: string;
  paper?: string;
  startAt?: number;
  matchLabels?: boolean;
  reducedMotion?: "auto" | "ignore";
};

export type ReelController = {
  play(): void;
  pause(): void;
  seek(t: number): void;
  destroy(): void;
  readonly playing: boolean;
  readonly time: number;
  readonly duration: number;
};

declare global {
  interface Window {
    DureReel?: { mount(el: HTMLElement, opts?: ReelOptions): ReelController };
  }
}
